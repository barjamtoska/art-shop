import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { siteOrigin } from "@/lib/acquisition/context";
import { db } from "@/lib/db";
import { webhookSecret } from "@/lib/env";
import { localCheckoutAvailable, stripe } from "@/lib/payments/gateway";

/**
 * The local test checkout's buttons (development without Stripe keys only).
 * Each sends a Stripe-format event, signed with the webhook secret, to the
 * real webhook — then returns the browser where Stripe would.
 */
export async function POST(request: Request) {
  if (!localCheckoutAvailable() || !webhookSecret) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }
  const form = await request.formData();
  const sessionId = String(form.get("session_id") ?? "");
  const choice = String(form.get("choice") ?? "");
  const origin = siteOrigin(request.headers);

  const order = await db.order.findUnique({ where: { stripeSessionId: sessionId } });
  if (!order) return Response.json({ error: "Unknown session" }, { status: 404 });

  if (choice === "cancel") {
    return NextResponse.redirect(`${origin}/api/acquisition/cancel?session_id=${sessionId}`, 303);
  }

  const field = (name: string) => String(form.get(name) ?? "").trim() || null;
  const paid = choice === "pay";
  const session = {
    id: sessionId,
    object: "checkout.session",
    mode: "payment",
    status: paid ? "complete" : "expired",
    payment_status: paid ? "paid" : "unpaid",
    amount_total: order.amountCents,
    currency: order.currency,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    payment_intent: paid ? `pi_local_${randomUUID().replace(/-/g, "")}` : null,
    customer_details: paid
      ? { name: field("name"), email: field("email"), phone: field("phone"), address: null }
      : null,
    collected_information: paid
      ? {
          shipping_details: {
            name: field("name"),
            address: {
              line1: field("line1"),
              line2: field("line2"),
              postal_code: field("postal_code"),
              city: field("city"),
              state: null,
              country: field("country"),
            },
          },
        }
      : null,
  };
  const event = {
    id: `evt_local_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: paid ? "checkout.session.completed" : "checkout.session.expired",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    data: { object: session },
  };

  const payload = JSON.stringify(event);
  const response = await fetch(`${origin}/api/webhooks/stripe`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret }),
    },
    body: payload,
  });
  if (!response.ok) console.error("Local test checkout: the webhook answered", response.status);

  const work = await db.artwork.findUnique({ where: { id: order.artworkId }, select: { slug: true } });
  return NextResponse.redirect(
    paid ? `${origin}/acquisition/complete?session_id=${sessionId}` : `${origin}/collection/${work?.slug ?? ""}`,
    303,
  );
}
