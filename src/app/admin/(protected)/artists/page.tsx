import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, StatusLabel, Table } from "@/components/admin/ui";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Artists" };

export default async function ArtistsAdminPage({ searchParams }: PageProps<"/admin/artists">) {
  const { deleted } = await searchParams;
  const artists = await db.artist.findMany({
    orderBy: { sortName: "asc" },
    include: { _count: { select: { artworks: true } } },
  });

  return (
    <>
      <PageHeader title="Artists" action={{ href: "/admin/artists/new", label: "Add an artist" }} />
      {deleted && (
        <p role="status" className="mb-6 text-ivory">
          The artist was deleted.
        </p>
      )}
      {artists.length === 0 ? (
        <EmptyState>No artists yet.</EmptyState>
      ) : (
        <Table caption="Artists" head={["Artist", "Works", "In the gallery"]}>
          {artists.map((artist) => (
            <tr key={artist.id}>
              <td>
                <Link
                  href={`/admin/artists/${artist.id}`}
                  className="underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                >
                  {artist.name}
                </Link>
                <span className="block text-ivory-muted">
                  {[artist.nationality, artist.lifeDates].filter(Boolean).join(", ")}
                </span>
              </td>
              <td className="tabular-nums">{artist._count.artworks}</td>
              <td>
                {artist.published ? (
                  <StatusLabel tone="positive">Shown</StatusLabel>
                ) : (
                  <StatusLabel>Hidden</StatusLabel>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
