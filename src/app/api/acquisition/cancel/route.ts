import { NextResponse } from "next/server";
import { releaseHold } from "@/lib/acquisition/hold";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { paymentGateway } from "@/lib/payments/gateway";

/**
 * The collector left checkout ("back" on Stripe's page). The session is
 * ended first; only once the payment provider confirms it can no longer be
 * paid is the work released. A session that turns out to be paid goes to
 * the confirmation page instead.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const order = sessionId
    ? await db.order.findUnique({
        where: { stripeSessionId: sessionId },
        select: { id: true, status: true, artwork: { select: { slug: true } } },
      })
    : null;
  if (!order) return NextResponse.redirect(new URL("/collection", url));

  const back = new URL(`/acquisition/cancelled?work=${encodeURIComponent(order.artwork.slug)}`, url);
  if (order.status !== "PENDING") {
    if (order.status === "PAID")
      return NextResponse.redirect(new URL(`/acquisition/complete?session_id=${sessionId}`, url));
    return NextResponse.redirect(back);
  }

  try {
    const status = await paymentGateway().expireCheckoutSession(sessionId!);
    if (status === "complete")
      return NextResponse.redirect(new URL(`/acquisition/complete?session_id=${sessionId}`, url));
    if (status === "expired" && (await releaseHold(db, order.id, "CANCELLED"))) refreshCatalogue();
  } catch (error) {
    // The hold then lapses on its own when the session expires.
    console.error(`Could not end checkout ${sessionId}:`, error);
  }
  return NextResponse.redirect(back);
}
