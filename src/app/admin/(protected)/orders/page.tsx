import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatusLabel, Table, formatDateTime } from "@/components/admin/ui";
import { orderStatusLabels } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { artwork: { select: { title: true, artist: { select: { name: true } } } } },
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every checkout, newest first. Payments and refunds are recorded from Stripe; here you can record shipping."
      />
      {orders.length === 0 ? (
        <EmptyState>No orders yet. Acquisitions open once Stripe is connected.</EmptyState>
      ) : (
        <Table caption="Orders" head={["Date", "Certificate", "Work", "Collector", "Amount", "Status", "Shipped"]}>
          {orders.map((order) => {
            const status = orderStatusLabels[order.status];
            return (
              <tr key={order.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/orders/${order.id}`} className="underline decoration-gold/40 underline-offset-4">
                    {formatDateTime(order.createdAt)}
                  </Link>
                </td>
                <td className="text-ivory-muted">{order.certificateNumber ?? "—"}</td>
                <td>
                  {order.artwork.title}
                  <span className="block text-ivory-muted">{order.artwork.artist.name}</span>
                </td>
                <td>{order.collectorName ?? order.email ?? "—"}</td>
                <td className="whitespace-nowrap">{formatPrice(order.amountCents)}</td>
                <td>
                  <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                </td>
                <td className="text-ivory-muted">
                  {order.shippedAt ? formatDateTime(order.shippedAt) : order.status === "PAID" ? "Not yet" : "—"}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
