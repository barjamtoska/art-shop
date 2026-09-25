import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hang } from "@/components/gallery/Hang";
import { copy } from "@/config/copy";
import { getArtist, getArtistSlugs } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getArtistSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/artists/[slug]">): Promise<Metadata> {
  const artist = await getArtist((await params).slug);
  if (!artist) return {};
  return { title: artist.name, description: artist.shortBio };
}

export default async function ArtistPage({ params }: PageProps<"/artists/[slug]">) {
  const artist = await getArtist((await params).slug);
  if (!artist) notFound();

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <Link
          href="/artists"
          className="font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory"
        >
          ← {copy.artists.title}
        </Link>
      </div>

      <div className="px-4 sm:px-8">
        <header className="mx-auto max-w-3xl pt-10 text-center sm:pt-14">
          <h1 className="text-5xl sm:text-7xl">{artist.name}</h1>
          <p className="mt-4 font-caps text-label tracking-caps text-ivory-muted">
            {artist.nationality}, {artist.lifeDates}
          </p>
          <div className="mx-auto mt-12 max-w-prose space-y-5 text-left font-display text-xl leading-relaxed text-ivory">
            {artist.biography.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
        </header>

        {artist.works.length > 0 && (
          <section aria-labelledby="works" className="mt-36">
            <h2 id="works" className="mb-24 text-center font-caps text-label tracking-caps text-ivory-muted">
              {copy.artists.worksInCollection}
            </h2>
            <Hang works={artist.works} label={copy.artists.worksInCollection} />
          </section>
        )}
      </div>
    </>
  );
}
