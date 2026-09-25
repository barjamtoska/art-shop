"use server";

import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, type FormState } from "@/lib/admin-form";
import { db } from "@/lib/db";

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
