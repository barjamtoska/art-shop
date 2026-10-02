import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_MINUTES, MAX_HOLDS_PER_VISITOR, holdWork, releaseLapsedHolds } from "@/lib/acquisition/hold";
import { startAcquisition } from "@/lib/acquisition/start";
import { handleStripeEvent, type WebhookDeps } from "@/lib/acquisition/webhook";
import { db } from "@/lib/db";
import type { Email } from "@/lib/email";
import type { CheckoutRequest, PaymentGateway } from "@/lib/payments/gateway";
import { cleanupTestRecords, makeArtwork } from "./helpers";

/*
 * Acquisition against the real database: holds, checkout, and every Stripe
 * event the webhook handles. The payment gateway and mailbox are fakes that
 * record what they were asked to do.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

afterAll(cleanupTestRecords);

function fakes() {
  const sessions: CheckoutRequest[] = [];
  const refunds: Array<{ paymentIntentId: string; key: string }> = [];
  const expired: string[] = [];
  const mail: Email[] = [];
  const gateway: PaymentGateway & { failCheckout: boolean; failRefund: boolean } = {
    kind: "local",
    failCheckout: false,
    failRefund: false,
    async createCheckoutSession(request) {
      if (this.failCheckout) throw new Error("Stripe is down");
      sessions.push(request);
      const id = `cs_test_${randomUUID().replace(/-/g, "")}`;
      return { id, url: `https://checkout.example/${id}` };
    },
    async expireCheckoutSession(id) {
      expired.push(id);
      return "expired";
    },
    async refund(paymentIntentId, key) {
      if (this.failRefund) throw new Error("Refund failed");
      refunds.push({ paymentIntentId, key });
      return { id: "re_test" };
    },
  };
  const deps: WebhookDeps & { failMail: boolean } = {
    db,
    gateway,
    failMail: false,
    async send(email) {
      if (deps.failMail) throw new Error("Mail is down");
      mail.push(email);
    },
    origin: "https://gallery.example",
    galleryEmails: ["gallery@example.com"],
    refresh: vi.fn(),
  };
  return { gateway, deps, sessions, refunds, expired, mail };
}

const ip = () => `ip-${randomUUID()}`;

/** Holds a test work and opens its checkout, as the Acquire button does. */
async function acquire(f: ReturnType<typeof fakes>, slug: string, now = new Date()) {
  const result = await startAcquisition(
    { db, gateway: f.gateway },
    { slug, clientIpHash: ip(), origin: f.deps.origin, liveMode: false, now },
  );
  if (!result.ok) throw new Error(`Could not acquire: ${result.reason}`);
  return db.order.findUniqueOrThrow({ where: { id: result.orderId } });
}

function event<T>(type: string, object: T): Stripe.Event {
  return {
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

function paid(order: { id: string; stripeSessionId: string | null }, paymentIntent = `pi_${randomUUID()}`) {
  return event("checkout.session.completed", {
    id: order.stripeSessionId,
    object: "checkout.session",
    payment_status: "paid",
    status: "complete",
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    payment_intent: paymentIntent,
    customer_details: { name: "Ada Collector", email: "ada@example.com", phone: "+353 1 555 0100" },
    collected_information: {
      shipping_details: { name: "Ada Collector", address: { line1: "1 Harbour Road", city: "Dublin", country: "IE" } },
    },
  });
}

const expiredEvent = (order: { id: string; stripeSessionId: string | null }) =>
  event("checkout.session.expired", {
    id: order.stripeSessionId,
    object: "checkout.session",
    payment_status: "unpaid",
    status: "expired",
    metadata: { orderId: order.id },
  });

const work = (id: string) => db.artwork.findUniqueOrThrow({ where: { id } });
const order = (id: string) => db.order.findUniqueOrThrow({ where: { id } });

// ---------------------------------------------------------------- Holds

describe("holds", () => {
  it("of ten simultaneous attempts on one work, exactly one gets the hold", async () => {
    const artwork = await makeArtwork();
    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false })),
    );
    expect(attempts.filter((a) => a.ok)).toHaveLength(1);
    expect(attempts.filter((a) => !a.ok).every((a) => !a.ok && a.reason === "reserved")).toBe(true);
    expect(await db.order.count({ where: { artworkId: artwork.id } })).toBe(1);
    expect((await work(artwork.id)).status).toBe("RESERVED");
  });

  it("a lapsed hold can be taken by someone else, and its order is closed", async () => {
    const artwork = await makeArtwork();
    const start = new Date();
    const first = await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false, now: start });
    const tooSoon = await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false, now: start });
    expect(tooSoon).toEqual({ ok: false, reason: "reserved" });

    const later = new Date(start.getTime() + (HOLD_MINUTES + 1) * 60_000);
    const second = await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false, now: later });
    expect(second.ok).toBe(true);
    expect((await order(first.ok ? first.order.id : "")).status).toBe("EXPIRED");
    expect((await work(artwork.id)).reservedOrderId).toBe(second.ok ? second.order.id : "");
  });

  it("a sold work cannot be held", async () => {
    const artwork = await makeArtwork({ status: "SOLD", soldAt: new Date() });
    expect(await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false })).toEqual({
      ok: false,
      reason: "sold",
    });
  });

  it("demonstration works cannot be acquired with live payments", async () => {
    const artwork = await makeArtwork({ isDemo: true });
    expect(await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: true })).toEqual({
      ok: false,
      reason: "demo",
    });
    expect((await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false })).ok).toBe(true);
  });

  it(`one visitor can hold at most ${MAX_HOLDS_PER_VISITOR} works at a time`, async () => {
    const visitor = ip();
    const works = await Promise.all(Array.from({ length: MAX_HOLDS_PER_VISITOR + 1 }, () => makeArtwork()));
    for (const w of works.slice(0, MAX_HOLDS_PER_VISITOR)) {
      expect((await holdWork(db, { slug: w.slug, clientIpHash: visitor, liveMode: false })).ok).toBe(true);
    }
    expect(await holdWork(db, { slug: works.at(-1)!.slug, clientIpHash: visitor, liveMode: false })).toEqual({
      ok: false,
      reason: "too-many-holds",
    });
  });

  it("the backstop releases holds whose expiry never arrived", async () => {
    const artwork = await makeArtwork();
    const start = new Date();
    const held = await holdWork(db, { slug: artwork.slug, clientIpHash: ip(), liveMode: false, now: start });
    await releaseLapsedHolds(db, new Date(start.getTime() + (HOLD_MINUTES + 1) * 60_000));
    expect((await work(artwork.id)).status).toBe("AVAILABLE");
    expect((await order(held.ok ? held.order.id : "")).status).toBe("EXPIRED");
  });
});

// ---------------------------------------------------------------- Checkout

describe("checkout", () => {
  let f: ReturnType<typeof fakes>;
  beforeEach(() => (f = fakes()));

  it("opens a session for the price on record, expiring before the hold", async () => {
    const artwork = await makeArtwork({ priceCents: 4_850_000 });
    const now = new Date();
    const placed = await acquire(f, artwork.slug, now);

    const [session] = f.sessions;
    expect(session.orderId).toBe(placed.id);
    expect(session.amountCents).toBe(4_850_000);
    expect(session.currency).toBe("eur");
    expect(session.successUrl).toBe("https://gallery.example/acquisition/complete?session_id={CHECKOUT_SESSION_ID}");
    expect(session.cancelUrl).toBe("https://gallery.example/api/acquisition/cancel?session_id={CHECKOUT_SESSION_ID}");
    const sessionEnds = session.expiresAt * 1000;
    expect(sessionEnds - now.getTime()).toBeGreaterThanOrEqual(30 * 60_000);
    expect(sessionEnds).toBeLessThan(placed.reservationExpiresAt.getTime());
    expect(placed.stripeSessionId).toMatch(/^cs_test_/);
  });

  it("releases the hold at once if the payment provider fails", async () => {
    const artwork = await makeArtwork();
    f.gateway.failCheckout = true;
    const result = await startAcquisition(
      { db, gateway: f.gateway },
      { slug: artwork.slug, clientIpHash: ip(), origin: f.deps.origin, liveMode: false },
    );
    expect(result).toEqual({ ok: false, reason: "payment-unavailable" });
    expect((await work(artwork.id)).status).toBe("AVAILABLE");
    const [only] = await db.order.findMany({ where: { artworkId: artwork.id } });
    expect(only.status).toBe("CANCELLED");
  });
});

// ---------------------------------------------------------------- Webhook

describe("the Stripe webhook", () => {
  let f: ReturnType<typeof fakes>;
  beforeEach(() => (f = fakes()));

  it("a completed payment sells the work, numbers the certificate and sends the emails", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    expect(await handleStripeEvent(f.deps, paid(placed))).toBe("recorded");

    const sold = await work(artwork.id);
    expect(sold.status).toBe("SOLD");
    expect(sold.soldAt).not.toBeNull();
    expect(sold.reservedOrderId).toBeNull();
    const done = await order(placed.id);
    expect(done.status).toBe("PAID");
    expect(done.certificateNumber).toMatch(/^MAI-\d{4}-\d{4}$/);
    expect(done.collectorName).toBe("Ada Collector");
    expect(done.email).toBe("ada@example.com");
    expect(done.shippingAddress).toMatchObject({ city: "Dublin", country: "IE" });
    expect(done.confirmationSentAt).not.toBeNull();
    expect(f.mail.map((m) => m.to)).toEqual(["ada@example.com", "gallery@example.com"]);
    expect(f.mail[0].text).toContain(`/certificate/${done.certificateToken}`);
    expect(f.deps.refresh).toHaveBeenCalled();
  });

  it("the same event delivered twice changes nothing the second time", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    const completed = paid(placed);
    await handleStripeEvent(f.deps, completed);
    const first = await order(placed.id);

    expect(await handleStripeEvent(f.deps, completed)).toBe("duplicate");
    expect(await order(placed.id)).toEqual(first);
    expect(f.mail).toHaveLength(2);
  });

  it("concurrent deliveries of one event are handled once", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    const completed = paid(placed);
    const outcomes = await Promise.all([1, 2, 3].map(() => handleStripeEvent(f.deps, completed)));
    expect(outcomes.filter((o) => o === "recorded")).toHaveLength(1);
    expect(f.mail).toHaveLength(2);
  });

  it("a payment for a work that has already sold is refunded, once", async () => {
    const artwork = await makeArtwork();
    const start = new Date();
    const first = await acquire(f, artwork.slug, start);
    // The first hold lapses unpaid; a second collector takes the work and pays…
    const second = await acquire(f, artwork.slug, new Date(start.getTime() + (HOLD_MINUTES + 1) * 60_000));
    await handleStripeEvent(f.deps, paid(second));
    // …then the first collector's (late) payment arrives.
    const late = paid(first, "pi_late");
    expect(await handleStripeEvent(f.deps, late)).toBe("recorded");

    expect((await order(first.id)).status).toBe("CONFLICT_REFUNDED");
    expect((await order(second.id)).status).toBe("PAID");
    expect(f.refunds).toEqual([{ paymentIntentId: "pi_late", key: `refund-${first.id}` }]);
    expect(f.mail.some((m) => m.subject.startsWith("About your acquisition"))).toBe(true);

    // Stripe resends the event: no second refund.
    expect(await handleStripeEvent(f.deps, late)).toBe("duplicate");
    expect(f.refunds).toHaveLength(1);
  });

  it("if that refund fails, nothing is recorded and Stripe's retry completes it", async () => {
    const artwork = await makeArtwork();
    const start = new Date();
    const first = await acquire(f, artwork.slug, start);
    const second = await acquire(f, artwork.slug, new Date(start.getTime() + (HOLD_MINUTES + 1) * 60_000));
    await handleStripeEvent(f.deps, paid(second));

    const late = paid(first, "pi_late_retry");
    f.gateway.failRefund = true;
    await expect(handleStripeEvent(f.deps, late)).rejects.toThrow("Refund failed");
    expect(await db.stripeEvent.findUnique({ where: { id: late.id } })).toBeNull();
    expect((await order(first.id)).status).not.toBe("CONFLICT_REFUNDED");

    f.gateway.failRefund = false;
    expect(await handleStripeEvent(f.deps, late)).toBe("recorded");
    expect((await order(first.id)).status).toBe("CONFLICT_REFUNDED");
    expect(f.refunds).toHaveLength(1);
  });

  it("a late payment beats a newer hold: the other checkout is ended", async () => {
    const artwork = await makeArtwork();
    const start = new Date();
    const first = await acquire(f, artwork.slug, start);
    const second = await acquire(f, artwork.slug, new Date(start.getTime() + (HOLD_MINUTES + 1) * 60_000));
    await handleStripeEvent(f.deps, paid(first));

    expect((await work(artwork.id)).status).toBe("SOLD");
    expect((await order(first.id)).status).toBe("PAID");
    expect((await order(second.id)).status).toBe("CANCELLED");
    expect(f.expired).toEqual([second.stripeSessionId]);
  });

  it("an expired checkout releases the hold", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    expect(await handleStripeEvent(f.deps, expiredEvent(placed))).toBe("recorded");
    expect((await work(artwork.id)).status).toBe("AVAILABLE");
    expect((await order(placed.id)).status).toBe("EXPIRED");
  });

  it("an expiry arriving after payment changes nothing", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    await handleStripeEvent(f.deps, paid(placed));
    expect(await handleStripeEvent(f.deps, expiredEvent(placed))).toBe("ignored");
    expect((await work(artwork.id)).status).toBe("SOLD");
    expect((await order(placed.id)).status).toBe("PAID");
  });

  it("a refund marks the order refunded, and the work stays sold", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    await handleStripeEvent(f.deps, paid(placed, "pi_refund_me"));
    const refunded = event("charge.refunded", { id: "ch_1", object: "charge", payment_intent: "pi_refund_me" });
    expect(await handleStripeEvent(f.deps, refunded)).toBe("recorded");
    expect((await order(placed.id)).status).toBe("REFUNDED");
    expect((await work(artwork.id)).status).toBe("SOLD");
  });

  it("a failed email does not fail the sale", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    f.deps.failMail = true;
    expect(await handleStripeEvent(f.deps, paid(placed))).toBe("recorded");
    expect((await work(artwork.id)).status).toBe("SOLD");
    const done = await order(placed.id);
    expect(done.status).toBe("PAID");
    // Left unsent, so the admin can send it again.
    expect(done.confirmationSentAt).toBeNull();
  });

  it("an unpaid completion is not a sale", async () => {
    const artwork = await makeArtwork();
    const placed = await acquire(f, artwork.slug);
    const unpaid = paid(placed);
    (unpaid.data.object as { payment_status: string }).payment_status = "unpaid";
    expect(await handleStripeEvent(f.deps, unpaid)).toBe("ignored");
    expect((await work(artwork.id)).status).toBe("RESERVED");
  });
});
