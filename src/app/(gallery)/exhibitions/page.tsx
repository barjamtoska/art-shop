import type { Metadata } from "next";
import Link from "next/link";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { QuietLabel } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getExhibitions } from "@/lib/catalog";
import { formatExhibitionDates } from "@/lib/format";
import { hangSize } from "@/lib/hang";

export const metadata: Metadata = {
  title: copy.exhibitions.title,
  description: copy.exhibitions.intro,
};

export default async function ExhibitionsPage() {
  const exhibitions = await getExhibitions();

  return (
    <div className="px-4 sm:px-8">
      <header className="mx-auto max-w-3xl pt-10 pb-8 text-center sm:pt-16">
        <h1 className="text-5xl sm:text-6xl">{copy.exhibitions.title}</h1>
        <p className="mt-5 font-display text-xl text-ivory-muted italic">{copy.exhibitions.intro}</p>
      </header>

      <ol className="mx-auto mt-24 max-w-6xl space-y-44">
        {exhibitions.map((exhibition, index) => {
          // An exhibition still being hung shows an empty frame.
          const lead = exhibition.works.at(0);
          const size = hangSize(lead?.widthCm ?? 40, lead?.heightCm ?? 50, 0.9);
          const href = `/exhibitions/${exhibition.slug}`;
          return (
            <li
              key={exhibition.slug}
              className={`relative flex flex-col items-center gap-14 md:flex-row md:gap-20 ${
                index % 2 ? "md:flex-row-reverse" : ""
              }`}
              data-hover-light=""
            >
              <div className="flex flex-1 justify-center">
                <div style={{ width: size.width }}>
                  {lead ? (
                    <FramedArtwork image={lead.image} frameStyle={lead.frameStyle} sizes={size.sizes} />
                  ) : (
                    <FramedArtwork emptyAspectRatio={0.8} />
                  )}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className="font-caps text-label tracking-caps text-ivory-muted">
                  {formatExhibitionDates(exhibition.opensOn, exhibition.closesOn)}
                </p>
                <h2 className="mt-3 text-5xl">
                  <Link href={href} className="after:absolute after:inset-0 after:content-['']">
                    {exhibition.title}
                  </Link>
                </h2>
                <p className="mt-3 font-display text-xl text-ivory-muted italic">{exhibition.subtitle}</p>
                <p className="mx-auto mt-6 max-w-prose text-ivory-muted md:mx-0">{exhibition.statement[0]}</p>
                <p className="mt-6 text-placard text-ivory-muted">{copy.exhibitions.works(exhibition.works.length)}</p>
                <div className="mt-8">
                  <QuietLabel>{copy.actions.enterExhibition}</QuietLabel>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
