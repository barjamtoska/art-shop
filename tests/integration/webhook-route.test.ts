import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

/* The webhook route: nothing is read or written until the signature checks out. */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { POST } = await import("@/app/api/webhooks/stripe/route");
const { webhookSecret } = await import("@/lib/env");
const stripe = new Stripe("sk_test_signing_only");

function signedRequest(payload: string, secret = webhookSecret!) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret }) },
    body: payload,
  });
}

/** An event the handler accepts but that changes nothing (no matching payment). */
const harmless = () =>
  JSON.stringify({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: "charge.refunded",
    data: { object: { id: "ch_none", object: "charge", payment_intent: "pi_matches_nothing" } },
  });

describe("POST /api/webhooks/stripe", () => {
  it("refuses an event without a signature, and records nothing", async () => {
    const payload = harmless();
    const response = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload }));
    expect(response.status).toBe(400);
    expect(await db.stripeEvent.findUnique({ where: { id: JSON.parse(payload).id } })).toBeNull();
  });

  it("refuses an event signed with the wrong secret, and records nothing", async () => {
    const payload = harmless();
    const response = await POST(signedRequest(payload, "whsec_someone_else"));
    expect(response.status).toBe(400);
    expect(await db.stripeEvent.findUnique({ where: { id: JSON.parse(payload).id } })).toBeNull();
  });

  it("refuses an event altered after signing", async () => {
    const payload = harmless();
    const request = signedRequest(payload);
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: payload.replace("pi_matches_nothing", "pi_someone_elses"),
    });
    expect((await POST(tampered)).status).toBe(400);
  });

  it("accepts a correctly signed event, once", async () => {
    const payload = harmless();
    const first = await POST(signedRequest(payload));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ received: true, outcome: "ignored" });
    expect(await db.stripeEvent.findUnique({ where: { id: JSON.parse(payload).id } })).not.toBeNull();

    const again = await POST(signedRequest(payload));
    expect(await again.json()).toMatchObject({ outcome: "duplicate" });
  });
});
