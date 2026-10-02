import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { PaymentGateway } from "@/lib/payments/gateway";
import { SESSION_MINUTES, holdWork, releaseHold, type HoldRefusal } from "./hold";

/*
 * "Acquire this work": hold the work, then open a checkout session for it.
 * If the payment provider fails, the hold is released at once.
 */

export type StartResult =
  { ok: true; checkoutUrl: string; orderId: string } | { ok: false; reason: HoldRefusal | "payment-unavailable" };

export async function startAcquisition(
  deps: {
    db: PrismaClient;
    gateway: PaymentGateway;
    imageUrl?: (image: { storage: "LOCAL" | "CLOUDINARY"; key: string }) => string | undefined;
  },
  input: { slug: string; clientIpHash: string | null; origin: string; liveMode: boolean; now?: Date },
): Promise<StartResult> {
  const now = input.now ?? new Date();
  const held = await holdWork(deps.db, {
    slug: input.slug,
    clientIpHash: input.clientIpHash,
    liveMode: input.liveMode,
    now,
  });
  if (!held.ok) return held;

  const { order, artwork } = held;
  try {
    const session = await deps.gateway.createCheckoutSession({
      orderId: order.id,
      amountCents: order.amountCents,
      currency: order.currency,
      productName: `${artwork.title}, ${artwork.yearLabel}`,
      description: `${artwork.artistName} · ${artwork.mediumDescription} · Original work. Shipping included.`,
      imageUrl: artwork.imageKey ? deps.imageUrl?.(artwork.imageKey) : undefined,
      expiresAt: Math.floor(now.getTime() / 1000) + SESSION_MINUTES * 60,
      successUrl: `${input.origin}/acquisition/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${input.origin}/api/acquisition/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });
    await deps.db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return { ok: true, orderId: order.id, checkoutUrl: session.url };
  } catch (error) {
    console.error("Checkout could not be opened; releasing the hold.", error);
    await releaseHold(deps.db, order.id, "CANCELLED", now);
    return { ok: false, reason: "payment-unavailable" };
  }
}
