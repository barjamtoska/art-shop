import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Stat, StatusLabel, Table, formatDateTime } from "@/components/admin/ui";
import { orderStatusLabels } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverview() {
  const now = new Date();
  const [onView, available, sold, drafts, holds, orders, openEnquiries] = await Promise.all([
    db.artwork.count({ where: { published: true } }),
    db.artwork.count({ where: { published: true, status: { not: "SOLD" } } }),
    db.artwork.count({ where: { status: "SOLD" } }),
    db.artwork.count({ where: { published: false } }),
    db.artwork.findMany({
      where: { status: "RESERVED", reservedUntil: { gt: now } },
      select: { id: true, title: true, reservedUntil: true, artist: { select: { name: true } } },
      orderBy: { reservedUntil: "asc" },
    }),
    db.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { artwork: { select: { title: true } } },
    }),
    db.enquiry.count({ where: { handledAt: null } }),
  ]);

  return (
    <>
      <PageHeader title="Overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Works on view" value={onView} href="/admin/artworks" />
        <Stat label="Available to acquire" value={available} href="/admin/artworks" />
        <Stat label="Sold" value={sold} href="/admin/artworks" />
        <Stat label="Drafts (not on view)" value={drafts} href="/admin/artworks" />
      </div>

      <section aria-labelledby="holds" className="mt-14">
        <h2 id="holds" className="mb-4 text-2xl">
          On hold now
        </h2>
        {holds.length === 0 ? (
          <EmptyState>No work is being held for a collector in checkout.</EmptyState>
        ) : (
          <Table caption="Works on hold" head={["Work", "Held until"]}>
            {holds.map((work) => (
              <tr key={work.id}>
                <td>
                  <Link href={`/admin/artworks/${work.id}`} className="underline decoration-gold/40 underline-offset-4">
                    {work.title}
                  </Link>
                  <span className="text-ivory-muted"> · {work.artist.name}</span>
                </td>
                <td>{formatDateTime(work.reservedUntil!)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section aria-labelledby="orders" className="mt-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="orders" className="text-2xl">
            Recent orders
          </h2>
          <Link
            href="/admin/orders"
            className="text-sm text-ivory-muted underline decoration-gold/40 underline-offset-4"
          >
            All orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <EmptyState>No orders yet. Acquisitions open once Stripe is connected.</EmptyState>
        ) : (
          <Table caption="Recent orders" head={["Date", "Work", "Collector", "Amount", "Status"]}>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/orders/${order.id}`} className="underline decoration-gold/40 underline-offset-4">
                    {formatDateTime(order.createdAt)}
                  </Link>
                </td>
                <td>{order.artwork.title}</td>
                <td>{order.collectorName ?? order.email ?? "—"}</td>
                <td>{formatPrice(order.amountCents)}</td>
                <td>
                  <StatusLabel tone={orderStatusLabels[order.status].tone}>
                    {orderStatusLabels[order.status].label}
                  </StatusLabel>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <p className="mt-14 text-ivory-muted">
        {openEnquiries === 0 ? (
          "No enquiries waiting."
        ) : (
          <Link href="/admin/enquiries" className="underline decoration-gold/40 underline-offset-4">
            {openEnquiries} {openEnquiries === 1 ? "enquiry" : "enquiries"} waiting for a reply
          </Link>
        )}
      </p>
    </>
  );
}
