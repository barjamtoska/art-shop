"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function setEnquiryHandled(enquiryId: string, handled: boolean): Promise<void> {
  await assertAdmin();
  await db.enquiry.update({ where: { id: enquiryId }, data: { handledAt: handled ? new Date() : null } });
  revalidatePath("/admin/enquiries");
}
