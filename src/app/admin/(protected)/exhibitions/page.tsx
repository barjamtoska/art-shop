import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatusLabel, Table } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatExhibitionDates } from "@/lib/format";

export const metadata: Metadata = { title: "Exhibitions" };

const iso = (date: Date | null) => date?.toISOString().slice(0, 10);

export default async function ExhibitionsAdminPage({ searchParams }: PageProps<"/admin/exhibitions">) {
  const { deleted } = await searchParams;
  const exhibitions = await db.exhibition.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { works: true } } },
  });

  return (
    <>
      <PageHeader
        title="Exhibitions"
        description="In the order shown on the Exhibitions page. The first is “Now showing” in the Entrance."
        action={{ href: "/admin/exhibitions/new", label: "Add an exhibition" }}
      />
      {deleted && (
        <p role="status" className="mb-6 text-ivory">
          The exhibition was deleted. Its works remain in the collection.
        </p>
      )}
      {exhibitions.length === 0 ? (
        <EmptyState>No exhibitions yet.</EmptyState>
      ) : (
        <Table caption="Exhibitions" head={["Exhibition", "Dates", "Works", "In the gallery", "Order"]}>
          {exhibitions.map((exhibition) => (
            <tr key={exhibition.id}>
              <td>
                <Link
                  href={`/admin/exhibitions/${exhibition.id}`}
                  className="underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                >
                  {exhibition.title}
                </Link>
                {exhibition.subtitle && <span className="block text-ivory-muted">{exhibition.subtitle}</span>}
              </td>
              <td className="text-ivory-muted">
                {formatExhibitionDates(iso(exhibition.opensOn), iso(exhibition.closesOn))}
              </td>
              <td className="tabular-nums">{exhibition._count.works}</td>
              <td>
                {exhibition.published ? (
                  <StatusLabel tone="positive">Shown</StatusLabel>
                ) : (
                  <StatusLabel>Hidden</StatusLabel>
                )}
              </td>
              <td className="text-ivory-muted tabular-nums">{exhibition.position}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
