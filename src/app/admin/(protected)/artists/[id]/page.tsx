import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { deleteArtist, updateArtist } from "../actions";
import { ArtistForm } from "../ArtistForm";

export async function generateMetadata({ params }: PageProps<"/admin/artists/[id]">): Promise<Metadata> {
  const artist = await db.artist.findUnique({ where: { id: (await params).id }, select: { name: true } });
  return { title: artist?.name ?? "Artist" };
}

export default async function EditArtistPage({ params, searchParams }: PageProps<"/admin/artists/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const artist = await db.artist.findUnique({
    where: { id },
    include: { artworks: { select: { id: true, title: true }, orderBy: { position: "asc" } } },
  });
  if (!artist) notFound();

  return (
    <>
      <PageHeader title={artist.name} back={{ href: "/admin/artists", label: "Artists" }} />
      {created && (
        <p role="status" className="mb-8 border border-gold/30 px-4 py-3 text-ivory">
          Artist added. You can now choose them when adding a work.
        </p>
      )}
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ArtistForm
          action={updateArtist.bind(null, artist.id)}
          values={{
            name: artist.name,
            sortName: artist.sortName,
            slug: artist.slug,
            lifeDates: artist.lifeDates,
            nationality: artist.nationality,
            shortBio: artist.shortBio,
            biography: artist.biography,
            published: artist.published,
          }}
        />
        <aside className="space-y-10">
          <section>
            <h2 className="mb-3 font-caps text-label tracking-caps text-ivory-muted">Works</h2>
            {artist.artworks.length === 0 ? (
              <p className="text-sm text-ivory-muted">None yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {artist.artworks.map((work) => (
                  <li key={work.id}>
                    <Link
                      href={`/admin/artworks/${work.id}`}
                      className="underline decoration-gold/40 underline-offset-4"
                    >
                      {work.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {artist.artworks.length === 0 && (
            <DeleteButton
              action={deleteArtist.bind(null, artist.id)}
              label="Delete this artist"
              confirmation={`Delete ${artist.name}? This cannot be undone.`}
            />
          )}
        </aside>
      </div>
    </>
  );
}
