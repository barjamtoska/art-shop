import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { Placard } from "@/components/gallery/Placard";
import { QuietButton, QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { site } from "@/config/site";
import { seedArtwork, seedArtworks } from "@/data/seed-collection";
import { hangSize, roomSize } from "@/lib/hang";

export const metadata: Metadata = {
  title: "Frame lab",
  robots: { index: false, follow: false },
};

/**
 * Development-only page for judging the design foundation: one hero work as it
 * will hang in the artwork room, every aspect ratio on the wall, frame variants
 * at several sizes, and the type scale. Screenshotted by `npm run shots`.
 */
export default function LabPage() {
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_LAB) notFound();

  const hero = seedArtwork("moonlight-wood-island-light");
  const heroSize = roomSize(hero.image.width / hero.image.height);
  const wall = seedArtworks.filter((a) => a.slug !== hero.slug);

  return (
    <main className="px-4 pb-40 sm:px-8">
      <header className="mx-auto max-w-6xl pt-10 pb-12 sm:pt-12">
        <p className="font-caps text-label tracking-caps text-ivory-muted">Design foundation</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">Frame lab</h1>
      </header>

      <section aria-label="A single work, as in the artwork room" className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-14 lg:flex-row lg:justify-center lg:gap-24">
          <div style={{ width: heroSize.width }} className="shrink-0">
            <FramedArtwork image={hero.image} frameStyle={hero.frameStyle} size="hero" sizes={heroSize.sizes} preload />
          </div>
          <div className="w-full max-w-sm">
            <Placard artwork={hero} variant="room" />
            <div className="mt-10 flex flex-col items-start gap-7">
              <QuietButton type="button">{copy.actions.acquire}</QuietButton>
              <QuietLink href="#type">{copy.actions.inspect}</QuietLink>
            </div>
          </div>
        </div>
      </section>

      <LabSection title="On the wall">
        <ul className="flex flex-wrap items-center justify-center gap-x-hang gap-y-28">
          {wall.map((artwork) => {
            const size = hangSize(artwork.widthCm, artwork.heightCm);
            return (
              <li key={artwork.slug} style={{ width: size.width }}>
                <FramedArtwork image={artwork.image} frameStyle={artwork.frameStyle} sizes={size.sizes} interactive />
                <Placard artwork={artwork} className="mt-9" />
              </li>
            );
          })}
        </ul>
      </LabSection>

      <LabSection title="Frame variants">
        <div className="flex flex-wrap items-end justify-center gap-x-16 gap-y-20">
          {[160, 280, 420].flatMap((px) =>
            (["CLASSIC", "SLIM"] as const).map((style) => (
              <figure key={`${px}-${style}`} style={{ width: `min(${px}px, 80vw)` }}>
                <FramedArtwork
                  image={hero.image}
                  frameStyle={style}
                  size={px < 200 ? "thumb" : "wall"}
                  sizes={`${Math.round(px * 0.74)}px`}
                />
                <figcaption className="mt-7 text-placard text-ivory-muted">
                  {style.toLowerCase()} · {px}px
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </LabSection>

      <LabSection title="Type" id="type">
        <div className="mx-auto max-w-3xl space-y-8">
          <p className="font-caps text-3xl tracking-display">{site.name}</p>
          <p className="font-display text-6xl font-light">The Collection</p>
          <p className="font-display text-3xl italic">Two Men Contemplating the Moon</p>
          <p className="font-caps text-label tracking-caps text-ivory-muted">Exhibition · Artist · Medium</p>
          <p className="max-w-prose text-ivory-muted">
            Body text is set small and quiet in Inter, in a warm secondary ivory. It never competes with the work on the
            wall — it waits beside it, like a label you lean in to read.
          </p>
          <div className="flex flex-wrap items-center gap-10">
            <QuietLink href="#">{copy.actions.enterCollection}</QuietLink>
            <QuietButton type="button">{copy.actions.acquire}</QuietButton>
            <QuietButton type="button" disabled>
              {copy.placard.reservedShort}
            </QuietButton>
          </div>
        </div>
      </LabSection>
    </main>
  );
}

function LabSection({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${title}-h`} className="mt-44">
      <h2 id={`${title}-h`} className="mb-20 text-center font-caps text-label tracking-caps text-ivory-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}
