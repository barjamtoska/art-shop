import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { SHIPPING_COUNTRIES } from "@/config/shipping";
import { startAcquisition } from "@/lib/acquisition/start";
import { db } from "@/lib/db";
import { createStripeClient, createStripeGateway } from "@/lib/payments/gateway";
import { cleanupTestRecords, makeArtwork } from "./helpers";

/*
 * The real Stripe gateway against stripe-mock, which validates every request
 * against Stripe's published API: an unknown or misspelt parameter, a wrong
 * type or an unsupported country code fails here rather than on the live
 * site. (stripe-mock's responses are fixtures; the acquisition tests cover
 * what the gallery does with Stripe's answers.)
 *
 * Runs when stripe-mock is reachable (`docker compose up -d` starts it); CI
 * always runs it.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockUrl = process.env.STRIPE_MOCK_URL ?? "http://localhost:12111";
const reachable = await fetch(mockUrl, { signal: AbortSignal.timeout(1500) }).then(
  () => true,
  () => false,
);
if (!reachable && process.env.CI) throw new Error(`stripe-mock is not reachable at ${mockUrl}`);

afterAll(cleanupTestRecords);

describe.skipIf(!reachable)("Stripe requests (checked by stripe-mock)", () => {
  const gateway = createStripeGateway(createStripeClient("sk_test_contract", mockUrl));

  it("opens a Checkout session exactly as the Acquire button does", async () => {
    const work = await makeArtwork();
    const result = await startAcquisition(
      { db, gateway, imageUrl: () => "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
      { slug: work.slug, clientIpHash: `ip-${randomUUID()}`, origin: "https://gallery.example", liveMode: false },
    );

    // A refused request releases the hold and reports "payment-unavailable".
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId } });
    expect(order.stripeSessionId).toMatch(/^cs_test_/);
  });

  it("offers only shipping countries Stripe Checkout accepts", () => {
    // Covered by the request above; this guards the list itself.
    expect(SHIPPING_COUNTRIES).not.toContain("RU");
    expect(SHIPPING_COUNTRIES).not.toContain("BY");
    expect(new Set(SHIPPING_COUNTRIES).size).toBe(SHIPPING_COUNTRIES.length);
  });

  it("ends a session and refunds a payment", async () => {
    const work = await makeArtwork();
    const result = await startAcquisition(
      { db, gateway },
      { slug: work.slug, clientIpHash: `ip-${randomUUID()}`, origin: "https://gallery.example", liveMode: false },
    );
    if (!result.ok) throw new Error(result.reason);
    const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId } });

    await expect(gateway.expireCheckoutSession(order.stripeSessionId!)).resolves.toMatch(/^(expired|complete|open)$/);
    await expect(gateway.refund("pi_contract", `refund-${order.id}`)).resolves.toMatchObject({
      id: expect.stringMatching(/^re_/),
    });
  });
});
