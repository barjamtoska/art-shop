import type Stripe from "stripe";
import { acquisitionDeps, siteOrigin } from "@/lib/acquisition/context";
import { handleStripeEvent } from "@/lib/acquisition/webhook";
import { webhookSecret } from "@/lib/env";
import { stripe } from "@/lib/payments/gateway";

/**
 * Stripe webhook. Every event's signature is verified against the raw body
 * before anything is read from it; a missing or invalid signature gets a 400
 * and changes nothing. Events to send: checkout.session.completed,
 * checkout.session.expired, charge.refunded.
 */
export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set; refusing webhook.");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(acquisitionDeps(siteOrigin(request.headers)), event);
    return Response.json({ received: true, outcome });
  } catch (error) {
    // Stripe retries on any non-2xx response; the event is recorded only on success.
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error);
    return Response.json({ error: "Could not process event" }, { status: 500 });
  }
}
