"use client";

import { useEffect } from "react";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { QuietButton, QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";

export default function GalleryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[60svh] flex-col items-center justify-center px-4 py-16 text-center">
      <div style={{ width: "min(220px, 50vw)" }}>
        <FramedArtwork emptyAspectRatio={0.8} unlit />
      </div>
      <h1 className="mt-14 text-4xl">{copy.error.title}</h1>
      <p className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">{copy.error.body}</p>
      <div className="mt-12 flex flex-col items-center gap-7 sm:flex-row sm:gap-12">
        <QuietButton type="button" onClick={reset}>
          {copy.error.retry}
        </QuietButton>
        <QuietLink href="/">{copy.notFound.back}</QuietLink>
      </div>
    </section>
  );
}
