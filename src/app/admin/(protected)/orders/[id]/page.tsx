import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm, TextField } from "@/components/admin/forms";
import { PageHeader, StatusLabel, formatDateTime } from "@/components/admin/ui";
import { orderStatusLabels } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { markShipped } from "../actions";

export const metadata: Metadata = { title: "Order" };

type Address = {
  line1?: string;
  line2?: string;
  postal_code?: string;
  city?: string;
  state?: string;
  country?: string;
};

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { artwork: { select: { id: true, title: true, yearLabel: true } } },
  });
  if (!order) notFound();

  const status = orderStatusLabels[order.status];
  const address = (order.shippingAddress ?? null) as Address | null;
  const rows: Array<[string, React.ReactNode]> = [
    [
      "Status",
      <StatusLabel key="s" tone={status.tone}>
        {status.label}
      </StatusLabel>,
    ],
    [
      "Work",
      <Link
        key="w"
        href={`/admin/artworks/${order.artwork.id}`}
        className="underline decoration-gold/40 underline-offset-4"
      >
        {order.artwork.title}, {order.artwork.yearLabel}
      </Link>,
    ],
    ["Amount", formatPrice(order.amountCents)],
    ["Certificate", order.certificateNumber ?? "—"],
    ["Collector", order.collectorName ?? "—"],
    ["Email", order.email ?? "—"],
    ["Phone", order.phone ?? "—"],
    [
      "Ship to",
      address
        ? [
            address.line1,
            address.line2,
            [address.postal_code, address.city].filter(Boolean).join(" "),
            address.state,
            address.country,
          ]
            .filter(Boolean)
            .join(", ")
        : "—",
    ],
    ["Started", formatDateTime(order.createdAt)],
    ["Paid", order.paidAt ? formatDateTime(order.paidAt) : "—"],
    ["Refunded", order.refundedAt ? formatDateTime(order.refundedAt) : "—"],
    ["Shipped", order.shippedAt ? `${formatDateTime(order.shippedAt)} · ${order.trackingReference}` : "—"],
    ["Stripe payment", order.stripePaymentIntentId ?? "—"],
  ];

  return (
    <>
      <PageHeader title={order.certificateNumber ?? "Order"} back={{ href: "/admin/orders", label: "Orders" }} />
      <dl className="grid max-w-3xl gap-x-10 gap-y-3 sm:grid-cols-[10rem_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-ivory-muted">{label}</dt>
            <dd className="text-ivory">{value}</dd>
          </div>
        ))}
      </dl>

      {order.status === "PAID" && (
        <section aria-labelledby="shipping" className="mt-14 max-w-xl">
          <h2 id="shipping" className="mb-5 text-2xl">
            {order.shippedAt ? "Update shipping" : "Mark as shipped"}
          </h2>
          <AdminForm
            action={markShipped.bind(null, order.id)}
            submitLabel={order.shippedAt ? "Update" : "Mark as shipped"}
          >
            <TextField name="trackingReference" label="Tracking reference" defaultValue={order.trackingReference} />
          </AdminForm>
        </section>
      )}
    </>
  );
}
