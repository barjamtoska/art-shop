import "server-only";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { SHIPPING_COUNTRIES } from "@/config/shipping";
import { env, localFallbacks, stripeConfigured } from "@/lib/env";

/*
 * How the gallery takes payment. Two implementations behind one interface:
 *
 * - Stripe: hosted Stripe Checkout (cards, including Apple Pay and Google Pay).
 * - Local test checkout (development without Stripe keys only): a page on
 *   this site stands in for Stripe's. Its "payment" sends a Stripe-format
 *   event, signed with the webhook secret, to the real webhook — so the code
 *   that records a sale is exactly the code that runs in production.
 *
 * Nothing here marks a work sold: only the verified webhook does.
 */

export type CheckoutRequest = {
  orderId: string;
  amountCents: number;
  currency: string;
  productName: string;
  description: string;
  imageUrl?: string;
  /** Unix seconds. Stripe allows 30 minutes to 24 hours from now. */
  expiresAt: number;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = { id: string; url: string };

export type PaymentGateway = {
  kind: "stripe" | "local";
  createCheckoutSession(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Ends an open session. Returns its final status: only "expired" means it can no longer be paid. */
  expireCheckoutSession(sessionId: string): Promise<"expired" | "complete" | "open">;
  refund(paymentIntentId: string, idempotencyKey: string): Promise<{ id: string }>;
};

/** Stripe's client; also verifies webhook signatures (no network needed for that). */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "sk_test_signature_verification_only", {
  appInfo: { name: "Maison gallery" },
  maxNetworkRetries: 2,
});

const stripeGateway: PaymentGateway = {
  kind: "stripe",
  async createCheckoutSession(request) {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        allowed_payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: request.currency,
              unit_amount: request.amountCents,
              product_data: {
                name: request.productName,
                description: request.description,
                ...(request.imageUrl && { images: [request.imageUrl] }),
              },
            },
          },
        ],
        shipping_address_collection: { allowed_countries: [...SHIPPING_COUNTRIES] },
        phone_number_collection: { enabled: true },
        expires_at: request.expiresAt,
        client_reference_id: request.orderId,
        metadata: { orderId: request.orderId },
        payment_intent_data: { metadata: { orderId: request.orderId } },
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
      },
      // Retrying the same order never opens a second session.
      { idempotencyKey: `checkout-${request.orderId}` },
    );
    if (!session.url) throw new Error("Stripe returned a session without a URL");
    return { id: session.id, url: session.url };
  },
  async expireCheckoutSession(sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") {
      const expired = await stripe.checkout.sessions.expire(sessionId);
      return expired.status === "expired" ? "expired" : expired.status === "complete" ? "complete" : "open";
    }
    return session.status === "complete" ? "complete" : "expired";
  },
  async refund(paymentIntentId, idempotencyKey) {
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey });
    return { id: refund.id };
  },
};

const localGateway: PaymentGateway = {
  kind: "local",
  async createCheckoutSession() {
    const id = `cs_local_${randomUUID().replace(/-/g, "")}`;
    return { id, url: `/acquisition/test-checkout?session_id=${id}` };
  },
  async expireCheckoutSession() {
    return "expired";
  },
  async refund() {
    return { id: `re_local_${randomUUID().replace(/-/g, "")}` };
  },
};

/** The gateway in use: Stripe when configured; otherwise the local test checkout (development only). */
export function paymentGateway(): PaymentGateway {
  if (stripeConfigured) return stripeGateway;
  if (localFallbacks) return localGateway;
  throw new Error("Stripe is not configured (STRIPE_SECRET_KEY)");
}

/** Whether the local test checkout stands in for Stripe (development without keys only). */
export function localCheckoutAvailable(): boolean {
  return !stripeConfigured && localFallbacks;
}
