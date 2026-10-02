import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { Hang } from "@/components/gallery/Hang";
import { JsonLd } from "@/components/site/JsonLd";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getArtist } from "@/lib/catalog";
import { ROOM_SIZE } from "@/lib/catalog/filters";
import { artistJsonLd } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const artist = await getArtist();
  if (!artist) return { title: copy.artist.title };
  return { title: artist.name, description: artist.shortBio, alternates: { canonical: "/artist" } };
}

/** The gallery's one artist: their life, their words, their work. */
export default async function ArtistPage() {
  const artist = await getArtist();
  if (!artist) notFound();

  const a = copy.artist;
  const works = artist.works.slice(0, ROOM_SIZE);
  const details = [artist.nationality, artist.lifeDates].filter(Boolean).join(", ");

  return (
    <div className="px-4 sm:px-8">
      <JsonLd data={artistJsonLd(artist)} />
      <header className="mx-auto max-w-3xl pt-10 text-center sm:pt-16">
        <p className="font-caps text-label tracking-caps text-ivory-muted">{a.title}</p>
        <h1 className="mt-4 text-5xl sm:text-7xl">{artist.name}</h1>
        {details && <p className="mt-4 font-caps text-label tracking-caps text-ivory-muted">{details}</p>}
      </header>

      <section
        aria-label={artist.name}
        className={`mx-auto mt-16 flex flex-col items-center gap-16 ${
          artist.portrait ? "max-w-5xl md:flex-row md:items-start md:gap-20" : "max-w-prose"
        }`}
      >
        {artist.portrait && (
          <div className="w-[min(320px,72vw)] shrink-0 md:sticky md:top-12">
            <FramedArtwork
              image={{ ...artist.portrait, zoomSrc: artist.portrait.src }}
              frameStyle="SLIM"
              sizes="(max-width: 640px) 54vw, 240px"
              preload
            />
          </div>
        )}
        <div className="space-y-5 font-display text-xl leading-relaxed text-ivory">
          {artist.biography.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </section>

      {artist.statement.length > 0 && (
        <section aria-labelledby="in-their-words" className="mx-auto mt-28 max-w-prose">
          <h2 id="in-their-words" className="text-center font-caps text-label tracking-caps text-ivory-muted">
            {a.inTheirWords}
          </h2>
          <blockquote className="mt-8 space-y-5 border-l border-gold/40 pl-8 font-display text-2xl leading-relaxed text-ivory italic">
            {artist.statement.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </blockquote>
        </section>
      )}

      {works.length > 0 && (
        <section aria-labelledby="works" className="mt-36">
          <h2 id="works" className="mb-24 text-center font-caps text-label tracking-caps text-ivory-muted">
            {a.worksInCollection}
          </h2>
          <Hang works={works} label={a.worksInCollection} />
          {artist.works.length > works.length && (
            <div className="mt-8 text-center">
              <QuietLink href="/collection">{a.seeAll}</QuietLink>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
