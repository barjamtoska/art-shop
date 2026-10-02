import Link from "next/link";
import { copy } from "@/config/copy";
import { site } from "@/config/site";
import { MobileMenu } from "./MobileMenu";
import { NavLinks } from "./NavLinks";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-8 sm:py-8 print:hidden">
      <Link href="/" className="font-caps text-xl tracking-display text-ivory">
        {site.name}
      </Link>
      <nav aria-label={copy.menu.label} className="hidden md:block">
        <NavLinks variant="bar" />
      </nav>
      <MobileMenu />
    </header>
  );
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only font-caps tracking-caps text-ivory focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-wall-deep focus:px-5 focus:py-3"
    >
      {copy.skipLink}
    </a>
  );
}
