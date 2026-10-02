import { releaseLapsedHolds } from "@/lib/acquisition/hold";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { env, localFallbacks } from "@/lib/env";

/**
 * Scheduled backstop (daily on Vercel): releases holds whose expiry event
 * never arrived. Normally Stripe's checkout.session.expired event does this
 * within minutes. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const authorised = env.CRON_SECRET
    ? request.headers.get("authorization") === `Bearer ${env.CRON_SECRET}`
    : localFallbacks;
  if (!authorised) return Response.json({ error: "Not authorised" }, { status: 401 });

  const released = await releaseLapsedHolds(db);
  if (released > 0) refreshCatalogue();
  return Response.json({ released });
}
