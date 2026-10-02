"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpHash, siteOrigin } from "@/lib/acquisition/context";
import type { HoldRefusal } from "@/lib/acquisition/hold";
import { startAcquisition } from "@/lib/acquisition/start";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { liveStripe } from "@/lib/env";
import { displaySrc } from "@/lib/images";
import { paymentGateway } from "@/lib/payments/gateway";

export type AcquireState = { refused?: HoldRefusal | "payment-unavailable" };

/**
 * "Acquire this work": holds the work for this visitor and sends them to
 * checkout. The price always comes from the database.
 */
export async function acquireWork(slug: string, _state: AcquireState): Promise<AcquireState> {
  const requestHeaders = await headers();
  const result = await startAcquisition(
    {
      db,
      gateway: paymentGateway(),
      // Stripe can show the painting only from a public address.
      imageUrl: (image) => (image.storage === "CLOUDINARY" ? displaySrc(image) : undefined),
    },
    {
      slug,
      clientIpHash: clientIpHash(requestHeaders),
      origin: siteOrigin(requestHeaders),
      liveMode: liveStripe,
    },
  );
  if (!result.ok) {
    // Someone else's hold or sale may not be on the page yet: show it.
    if (result.reason === "sold" || result.reason === "reserved") refreshCatalogue();
    return { refused: result.reason };
  }
  // Visitors now see "Under consideration" while the hold lasts.
  refreshCatalogue();
  redirect(result.checkoutUrl);
}
