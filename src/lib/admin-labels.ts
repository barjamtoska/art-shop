import type { ArtworkStatus, OrderStatus } from "@/generated/prisma/enums";

/* Human wording and tone for statuses shown in the admin. */

type Tone = "neutral" | "positive" | "attention" | "alert";

export function artworkStatusLabel(status: ArtworkStatus, reservedUntil: Date | null, now = new Date()) {
  if (status === "SOLD") return { label: "Sold", tone: "neutral" as Tone };
  if (status === "RESERVED" && reservedUntil && reservedUntil > now)
    return { label: "On hold", tone: "attention" as Tone };
  return { label: "Available", tone: "positive" as Tone };
}

export const orderStatusLabels: Record<OrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "In checkout", tone: "attention" },
  PAID: { label: "Paid", tone: "positive" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  REFUNDED: { label: "Refunded", tone: "alert" },
  CONFLICT_REFUNDED: { label: "Refunded (already sold)", tone: "alert" },
};
