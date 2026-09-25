import type { Metadata } from "next";
import Link from "next/link";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { copy } from "@/config/copy";
import { getArtists } from "@/lib/catalog";

export const metadata: Metadata = {
  title: copy.artists.title,
  description: copy.artists.intro,
};

/** A directory, as on a museum wall: names, dates, one line each. */
export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <div className="px-4 sm:px-8">
      <header className="mx-auto max-w-3xl pt-10 pb-8 text-center sm:pt-16">
        <h1 className="text-5xl sm:text-6xl">{copy.artists.title}</h1>
        <p className="mt-5 font-display text-xl text-ivory-muted italic">{copy.artists.intro}</p>
      </header>

      <ul className="mx-auto mt-20 max-w-5xl border-t border-gold/20">
        {artists.map((artist) => {
          const [work] = artist.works;
          return (
            <li
              key={artist.slug}
              className="relative flex items-center gap-6 border-b border-gold/20 py-9 sm:gap-12"
              data-hover-light=""
            >
              <div className="flex-1">
                <h2 className="text-3xl sm:text-4xl">
                  <Link href={`/artists/${artist.slug}`} className="after:absolute after:inset-0 after:content-['']">
                    {artist.name}
                  </Link>
                </h2>
                <p className="mt-2 font-caps text-label tracking-caps text-ivory-muted">
                  {artist.nationality}, {artist.lifeDates}
                </p>
                <p className="mt-3 max-w-prose text-ivory-muted">{artist.shortBio}</p>
                <p className="mt-3 text-placard text-ivory-muted">{copy.exhibitions.works(artist.works.length)}</p>
              </div>
              {work && (
                <div className="w-20 shrink-0 sm:w-36">
                  <FramedArtwork
                    image={work.image}
                    frameStyle={work.frameStyle}
                    size="thumb"
                    sizes="(max-width: 640px) 60px, 110px"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
