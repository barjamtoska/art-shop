import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmptyState, PageHeader, StatusLabel, Table } from "@/components/admin/ui";
import { artworkStatusLabel } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { displaySrc } from "@/lib/images";

export const metadata: Metadata = { title: "Artworks" };

export default async function ArtworksPage({ searchParams }: PageProps<"/admin/artworks">) {
  const { deleted } = await searchParams;
  const works = await db.artwork.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      artist: { select: { name: true } },
      images: { where: { kind: "PRIMARY" }, take: 1 },
    },
  });
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Artworks"
        description="In hanging order. Drafts are not on view until you publish them."
        action={{ href: "/admin/artworks/new", label: "Add a work" }}
      />
      {deleted && (
        <p role="status" className="mb-6 text-ivory">
          The work was deleted.
        </p>
      )}
      {works.length === 0 ? (
        <EmptyState>No works yet.</EmptyState>
      ) : (
        <Table caption="Artworks" head={["", "Work", "Price", "Sale", "On view", "Order"]}>
          {works.map((work) => {
            const image = work.images[0];
            const status = artworkStatusLabel(work.status, work.reservedUntil, now);
            return (
              <tr key={work.id}>
                <td className="w-16">
                  {image ? (
                    <Image
                      src={displaySrc(image)}
                      alt=""
                      width={56}
                      height={Math.round((56 * image.height) / image.width)}
                      className="max-h-16 w-14 object-contain"
                      sizes="56px"
                    />
                  ) : (
                    <span className="block h-14 w-14 border border-dashed border-gold/30" aria-label="No photograph" />
                  )}
                </td>
                <td>
                  <Link
                    href={`/admin/artworks/${work.id}`}
                    className="text-ivory underline decoration-gold/40 underline-offset-4 hover:decoration-gold"
                  >
                    {work.title}
                  </Link>
                  <span className="block text-ivory-muted">
                    {work.artist.name}, {work.yearLabel}
                  </span>
                  {work.isDemo && <span className="mt-1 block text-xs text-ivory-muted">Demonstration work</span>}
                </td>
                <td className="whitespace-nowrap">{formatPrice(work.priceCents)}</td>
                <td>
                  <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                </td>
                <td>
                  {work.published ? (
                    <StatusLabel tone="positive">{work.featured ? "On view · Entrance" : "On view"}</StatusLabel>
                  ) : (
                    <StatusLabel>Draft</StatusLabel>
                  )}
                </td>
                <td className="text-ivory-muted tabular-nums">{work.position}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
