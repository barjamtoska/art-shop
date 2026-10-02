import { type ReactNode, ViewTransition } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader, SkipLink } from "@/components/site/SiteHeader";

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {/* Moving between rooms: the old room dims, the new one comes up (globals.css). */}
        <ViewTransition default="room">{children}</ViewTransition>
      </main>
      <SiteFooter />
    </>
  );
}
