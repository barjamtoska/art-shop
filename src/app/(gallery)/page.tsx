import type { CSSProperties } from "react";
import Link from "next/link";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { site } from "@/config/site";
import { getExhibitions, getFeaturedArtwork } from "@/lib/catalog";
import { roomSize } from "@/lib/hang";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

/**
 * The Entrance: a dim room, one painting under the light, the gallery's name,
 * and a single invitation. The light comes up first, then the painting, then
 * the words — each a slow fade.
 */
export default async function Entrance() {
  const [work, exhibitions] = await Promise.all([getFeaturedArtwork(), getExhibitions()]);
  const nowShowing = exhibitions.find((e) => e.works.length > 0);
  // Before the first work is hung, the Entrance shows an empty lit frame.
  const aspectRatio = work ? work.image.width / work.image.height : 0.8;
  const size = roomSize(aspectRatio, { maxPx: work ? 560 : 300, heightShare: 0.5 });

  return (
    <>
      <div className="dim-wall" aria-hidden="true" />
      <section className="flex min-h-[calc(100svh-6rem)] flex-col items-center justify-center px-4 pt-4 pb-20 text-center">
        <h1
          className="fade-in font-caps text-4xl tracking-[0.32em] text-ivory sm:text-5xl"
          style={{ ...delay(300), marginRight: "-0.32em" }}
        >
          {site.name}
        </h1>
        <p className="fade-in mt-4 font-display text-lg text-ivory-muted italic" style={delay(450)}>
          {site.tagline}
        </p>

        {work ? (
          <>
            <Link
              href={`/collection/${work.slug}`}
              className="mt-14 block sm:mt-16"
              style={{ width: size.width }}
              aria-label={`${work.title}, ${work.artist.name}`}
            >
              <FramedArtwork image={work.image} frameStyle={work.frameStyle} size="hero" sizes={size.sizes} preload />
            </Link>

            {/* On phones, title and artist sit on their own lines rather than breaking mid-name. */}
            <p className="fade-in mt-10 font-display text-lg text-ivory-muted" style={delay(600)}>
              <cite className="block sm:inline">{work.title}</cite>
              <span className="sr-only">, </span>
              <span className="mx-2 hidden text-gold/80 sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="block sm:inline">{work.artist.name}</span>
            </p>
          </>
        ) : (
          <div className="mt-14 sm:mt-16" style={{ width: size.width }}>
            <FramedArtwork emptyAspectRatio={aspectRatio} size="hero" />
          </div>
        )}

        <div className="fade-in mt-12" style={delay(750)}>
          <QuietLink href="/collection">{copy.actions.enterCollection}</QuietLink>
        </div>

        {nowShowing && (
          <p className="fade-in mt-16 text-placard text-ivory-muted" style={delay(900)}>
            <span className="font-caps tracking-caps">{copy.entrance.currentExhibition}</span>
            <span className="mx-2 text-gold/80" aria-hidden="true">
              ·
            </span>
            <Link
              href={`/exhibitions/${nowShowing.slug}`}
              className="font-display text-base text-ivory italic underline decoration-gold/50 underline-offset-4 transition-colors duration-500 hover:decoration-gold"
            >
              {nowShowing.title}
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
