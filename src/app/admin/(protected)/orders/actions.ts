"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, type FormState } from "@/lib/admin-form";
import { siteOrigin } from "@/lib/acquisition/context";
import { sendAcquisitionEmails } from "@/lib/acquisition/emails";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { galleryEmails } from "@/lib/env";

/*
 * What the admin may change on an order: shipping details only. Payment,
 * refunds and the sale itself are recorded from Stripe (Phase 4).
 */

const shippedSchema = z.object({
  trackingReference: z.string().trim().min(1, "Enter the tracking reference.").max(120),
});

export async function markShipped(orderId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const parsed = shippedSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalid(parsed.error);
    const { count } = await db.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { trackingReference: parsed.data.trackingReference, shippedAt: new Date() },
    });
    if (count === 0) return failed("Only a paid order can be marked as shipped.");
    return saved("Marked as shipped.");
  });
}

/** Sends the collector's confirmation again (e.g. if the first one failed). */
export async function resendConfirmation(orderId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const origin = siteOrigin(await headers());
    const result = await sendAcquisitionEmails({ db, send: sendEmail, origin, galleryEmails }, orderId, {
      force: true,
    });
    if (result === "not-paid") return failed("Only a paid order with an email address has a confirmation.");
    if (result === "failed") return failed("The email could not be sent. Please try again later.");
    return saved("Confirmation sent again.");
  });
}

/**
 * After a refund, puts the work back on sale. This is the only manual change
 * to a work's sale status, and it only ever goes from sold to available —
 * never to sold.
 */
export async function returnToSale(orderId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, artworkId: true } });
    if (!order || order.status !== "REFUNDED") return failed("Only a refunded sale can return its work to sale.");
    const stillSold = await db.order.count({ where: { artworkId: order.artworkId, status: "PAID" } });
    if (stillSold > 0) return failed("The work has another paid order, so it stays sold.");
    const { count } = await db.artwork.updateMany({
      where: { id: order.artworkId, status: "SOLD" },
      data: { status: "AVAILABLE", soldAt: null },
    });
    if (count === 0) return failed("The work is not marked sold.");
    refreshCatalogue();
    return saved("The work is available again.");
  });
}
