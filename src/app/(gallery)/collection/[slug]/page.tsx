import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkZoom, ZoomButton, ZoomSurface } from "@/components/gallery/ArtworkZoom";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { Hang } from "@/components/gallery/Hang";
import { AcquireForm } from "@/components/gallery/AcquireForm";
import { JsonLd } from "@/components/site/JsonLd";
import { Placard } from "@/components/gallery/Placard";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getArtist, getArtwork, getArtworkSlugs, getRelatedWorks } from "@/lib/catalog";
import type { Artwork } from "@/lib/catalog/types";
import { formatDimensionsCm, formatDimensionsIn } from "@/lib/format";
import { roomSize } from "@/lib/hang";
import { artworkJsonLd } from "@/lib/structured-data";
import { acquireWork } from "./actions";

export async function generateStaticParams() {
  return (await getArtworkSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/collection/[slug]">): Promise<Metadata> {
  const artwork = await getArtwork((await params).slug);
  if (!artwork) return {};
  return {
    title: `${artwork.title}, ${artwork.artist.name}`,
    description: artwork.metaDescription ?? artwork.description[0],
    alternates: { canonical: `/collection/${artwork.slug}` },
    openGraph: { type: "article" },
  };
}

const quietLink =
  "text-ivory underline decoration-gold/50 underline-offset-4 transition-colors duration-500 hover:decoration-gold";

export default async function ArtworkRoom({ params }: PageProps<"/collection/[slug]">) {
  const artwork = await getArtwork((await params).slug);
  if (!artwork) notFound();

  const [artist, related] = await Promise.all([getArtist(), getRelatedWorks(artwork, 3)]);
  const size = roomSize(artwork.image.width / artwork.image.height);
  const a = copy.artwork;

  return (
    <article>
      <JsonLd data={artworkJsonLd(artwork)} />
      <ArtworkZoom image={artwork.image} zoomSrc={artwork.image.zoomSrc} title={artwork.title}>
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <Link
            href="/collection"
            className="font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory"
          >
            ← {copy.actions.backToCollection}
          </Link>

          <div className="mt-10 flex flex-col items-center gap-14 lg:mt-6 lg:flex-row lg:justify-center lg:gap-24">
            <div className="relative shrink-0" style={{ width: size.width }}>
              <FramedArtwork
                image={artwork.image}
                frameStyle={artwork.frameStyle}
                size="hero"
                sizes={size.sizes}
                preload
              />
              <ZoomSurface />
            </div>

            <div className="w-full max-w-sm">
              <h1 className="sr-only">
                {artwork.title}, {artwork.artist.name}
              </h1>
              <Placard artwork={artwork} variant="room" />
              <div className="mt-10 flex flex-col items-start gap-7">
                <AcquireAction artwork={artwork} />
                <ZoomButton className="group relative pb-1 font-caps text-label tracking-caps text-ivory">
                  {copy.actions.inspect}
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-[0.3] bg-gold/70 transition-transform duration-700 ease-gallery group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  />
                </ZoomButton>
              </div>
            </div>
          </div>
        </div>
      </ArtworkZoom>

      <div className="mx-auto mt-40 grid max-w-5xl gap-20 px-4 sm:px-8 md:grid-cols-[3fr_2fr] md:gap-24">
        <section aria-labelledby="about">
          <h2 id="about" className="font-caps text-label tracking-caps text-ivory-muted">
            {a.about}
          </h2>
          <div className="mt-6 space-y-5 font-display text-xl leading-relaxed text-ivory">
            {artwork.description.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
        </section>

        {artist && (
          <section aria-labelledby="the-artist">
            <h2 id="the-artist" className="font-caps text-label tracking-caps text-ivory-muted">
              {a.theArtist}
            </h2>
            <p className="mt-6 font-display text-2xl text-ivory">{artist.name}</p>
            <p className="mt-1 text-placard text-ivory-muted">
              {artist.nationality}, {artist.lifeDates}
            </p>
            <p className="mt-5 text-ivory-muted">{artist.shortBio}</p>
            <div className="mt-8">
              <QuietLink href="/artist">{copy.actions.viewArtist}</QuietLink>
            </div>
          </section>
        )}
      </div>

      <section aria-labelledby="details" className="mx-auto mt-24 max-w-5xl px-4 sm:px-8">
        <h2 id="details" className="font-caps text-label tracking-caps text-ivory-muted">
          {a.details}
        </h2>
        <dl className="mt-6 grid gap-x-12 gap-y-4 border-t border-gold/20 pt-6 text-placard sm:grid-cols-[10rem_1fr]">
          <dt className="text-ivory-muted">Medium</dt>
          <dd className="text-ivory">{artwork.mediumDescription}</dd>
          <dt className="text-ivory-muted">Dimensions</dt>
          <dd className="text-ivory">
            {formatDimensionsCm(artwork.heightCm, artwork.widthCm, artwork.depthCm)} (
            {formatDimensionsIn(artwork.heightCm, artwork.widthCm, artwork.depthCm)})
          </dd>
          {artwork.exhibitions.length > 0 && (
            <>
              <dt className="text-ivory-muted">Exhibition</dt>
              <dd className="text-ivory">
                {artwork.exhibitions.map((e, i) => (
                  <span key={e.slug}>
                    {i > 0 && ", "}
                    <Link href={`/exhibitions/${e.slug}`} className={quietLink}>
                      {e.title}
                    </Link>
                  </span>
                ))}
              </dd>
            </>
          )}
          {artwork.image.credit && (
            <>
              <dt className="text-ivory-muted">{a.imageCredit}</dt>
              <dd className="text-ivory-muted">{artwork.image.credit}</dd>
            </>
          )}
        </dl>
        {artwork.isDemo && <p className="mt-8 max-w-prose text-placard text-ivory-muted italic">{a.demoNote}</p>}
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-44 px-4 sm:px-8">
          <h2 id="related" className="mb-24 text-center font-caps text-label tracking-caps text-ivory-muted">
            {a.related}
          </h2>
          <Hang works={related} compact label={a.related} />
        </section>
      )}
    </article>
  );
}

/**
 * The single, quiet action: acquire a work that is available now; for a work
 * on hold or in a private collection, an enquiry instead.
 */
function AcquireAction({ artwork }: { artwork: Artwork }) {
  if (artwork.status !== "AVAILABLE") {
    return <QuietLink href={`/visit?work=${artwork.slug}#enquiry`}>{copy.actions.enquire}</QuietLink>;
  }
  return <AcquireForm action={acquireWork.bind(null, artwork.slug)} />;
}
