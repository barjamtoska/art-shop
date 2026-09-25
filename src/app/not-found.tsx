import type { Metadata } from "next";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader, SkipLink } from "@/components/site/SiteHeader";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";

export const metadata: Metadata = {
  title: copy.notFound.title,
  robots: { index: false },
};

/** "This room is closed": an empty frame under the light. */
export default function NotFound() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <div className="dim-wall" aria-hidden="true" />
        <section className="flex min-h-[70svh] flex-col items-center justify-center px-4 py-16 text-center">
          <div style={{ width: "min(300px, 62vw)" }}>
            <FramedArtwork emptyAspectRatio={0.8} size="hero" />
          </div>
          <h1 className="mt-16 text-4xl sm:text-5xl">{copy.notFound.title}</h1>
          <p className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">{copy.notFound.body}</p>
          <div className="mt-12">
            <QuietLink href="/">{copy.notFound.back}</QuietLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
