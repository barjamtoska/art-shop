import "server-only";
import type Stripe from "stripe";
import { site } from "@/config/site";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PaymentGateway } from "@/lib/payments/gateway";
import { sendAcquisitionEmails, sendConflictEmails, type SendEmail } from "./emails";
import { releaseHold } from "./hold";

/*
 * Stripe events, after their signature has been verified (see the route).
 * This is the only place a work becomes SOLD.
 *
 * Each event is handled once: its id is recorded in the same transaction as
 * its effects, so a repeated or concurrent delivery changes nothing.
 *
 * - checkout.session.completed (paid): the work is marked sold — only if it
 *   is not sold already — and the order paid, with a certificate number.
 *   If the work had already sold, the payment is refunded inside the same
 *   transaction (idempotently); if the refund fails, nothing is recorded and
 *   Stripe retries the event.
 * - checkout.session.expired: the hold is released.
 * - charge.refunded: the order is marked refunded; the work stays sold, and
 *   only the admin can return it to sale.
 */

export type WebhookDeps = {
  db: PrismaClient;
  gateway: PaymentGateway;
  send: SendEmail;
  /** Absolute site URL for links in emails. */
  origin: string;
  galleryEmails: string[];
  /** Rebuilds public pages after a change visitors can see. */
  refresh: () => void;
  now?: () => Date;
};

export type WebhookOutcome = "recorded" | "duplicate" | "ignored";

type FollowUp = () => Promise<unknown>;

export async function handleStripeEvent(deps: WebhookDeps, event: Stripe.Event): Promise<WebhookOutcome> {
  const now = deps.now?.() ?? new Date();
  const followUps: FollowUp[] = [];
  let outcome: WebhookOutcome = "ignored";
  let publicChange = false;

  await deps.db.$transaction(
    async (tx) => {
      // First delivery wins; a concurrent duplicate waits here, then finds the row.
      const inserted = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO "StripeEvent" ("id", "type") VALUES (${event.id}, ${event.type})
        ON CONFLICT ("id") DO NOTHING RETURNING "id"`;
      if (inserted.length === 0) {
        outcome = "duplicate";
        return;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const result = await onCheckoutCompleted(tx, deps, event.data.object, now, followUps);
          outcome = result === "ignored" ? "ignored" : "recorded";
          publicChange = result === "sold";
          break;
        }
        case "checkout.session.expired": {
          const released = await onCheckoutExpired(tx, event.data.object, now);
          outcome = released ? "recorded" : "ignored";
          publicChange = released;
          break;
        }
        case "charge.refunded": {
          outcome = (await onChargeRefunded(tx, event.data.object, now)) ? "recorded" : "ignored";
          break;
        }
      }
    },
    // Long enough for a refund call on the rare conflict path.
    { maxWait: 10_000, timeout: 30_000 },
  );

  if (publicChange) deps.refresh();
  for (const followUp of followUps) {
    try {
      await followUp();
    } catch (error) {
      console.error(`Follow-up for Stripe event ${event.id} failed:`, error);
    }
  }
  return outcome;
}

async function onCheckoutCompleted(
  tx: Prisma.TransactionClient,
  deps: WebhookDeps,
  session: Stripe.Checkout.Session,
  now: Date,
  followUps: FollowUp[],
): Promise<"sold" | "refunded" | "ignored"> {
  // Cards settle at once; anything not yet paid is not a sale.
  if (session.payment_status !== "paid") return "ignored";

  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  const order = orderId ? await tx.order.findUnique({ where: { id: orderId } }) : null;
  if (!order) {
    console.warn(`Paid checkout ${session.id} names no known order; ignored.`);
    return "ignored";
  }
  if (order.stripeSessionId && order.stripeSessionId !== session.id) {
    console.warn(`Checkout ${session.id} does not match order ${order.id}; ignored.`);
    return "ignored";
  }
  if (order.status === "PAID" || order.status === "REFUNDED" || order.status === "CONFLICT_REFUNDED") return "ignored";

  const shipping = session.collected_information?.shipping_details ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const collector = {
    collectorName: session.customer_details?.name ?? shipping?.name ?? null,
    email: session.customer_details?.email ?? null,
    phone: session.customer_details?.phone ?? null,
    shippingAddress: shipping ? { name: shipping.name, ...shipping.address } : undefined,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
  };

  const before = await tx.artwork.findUnique({ where: { id: order.artworkId }, select: { reservedOrderId: true } });
  const { count } = await tx.artwork.updateMany({
    where: { id: order.artworkId, status: { not: "SOLD" } },
    data: { status: "SOLD", soldAt: now, reservedUntil: null, reservedOrderId: null },
  });

  if (count === 1) {
    const [{ n }] = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT nextval('certificate_number_seq') AS n`;
    const certificateNumber = `${site.certificatePrefix}-${now.getUTCFullYear()}-${String(n).padStart(4, "0")}`;
    await tx.order.update({
      where: { id: order.id },
      data: { ...collector, status: "PAID", paidAt: now, certificateNumber },
    });

    // Someone else's hold (taken after this one lapsed) ends: this payment came first.
    const displaced = before?.reservedOrderId && before.reservedOrderId !== order.id ? before.reservedOrderId : null;
    if (displaced) {
      const other = await tx.order.findUnique({ where: { id: displaced }, select: { stripeSessionId: true } });
      await tx.order.updateMany({
        where: { id: displaced, status: "PENDING" },
        data: { status: "CANCELLED", closedAt: now },
      });
      if (other?.stripeSessionId) followUps.push(() => deps.gateway.expireCheckoutSession(other.stripeSessionId!));
    }
    followUps.push(() => sendAcquisitionEmails(deps, order.id));
    return "sold";
  }

  // The work had already sold: refund this payment. Inside the transaction,
  // so a failed refund records nothing and Stripe retries the event.
  if (!paymentIntentId) throw new Error(`Paid checkout ${session.id} has no payment intent to refund`);
  await deps.gateway.refund(paymentIntentId, `refund-${order.id}`);
  await tx.order.update({
    where: { id: order.id },
    data: { ...collector, status: "CONFLICT_REFUNDED", refundedAt: now, closedAt: now },
  });
  followUps.push(() => sendConflictEmails(deps, order.id));
  return "refunded";
}

async function onCheckoutExpired(tx: Prisma.TransactionClient, session: Stripe.Checkout.Session, now: Date) {
  const order = await tx.order.findFirst({
    where: { OR: [{ stripeSessionId: session.id }, { id: session.metadata?.orderId ?? "" }] },
    select: { id: true, status: true },
  });
  // Only a hold still pending is released; an expiry after payment changes nothing.
  if (!order || order.status !== "PENDING") return false;
  return releaseHold(tx, order.id, "EXPIRED", now);
}

async function onChargeRefunded(tx: Prisma.TransactionClient, charge: Stripe.Charge, now: Date) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id ?? null);
  if (!paymentIntentId) return false;
  // The work stays sold: returning it to sale is the admin's decision.
  const paid = await tx.order.updateMany({
    where: { stripePaymentIntentId: paymentIntentId, status: "PAID" },
    data: { status: "REFUNDED", refundedAt: now },
  });
  return paid.count > 0;
}
