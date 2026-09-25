import Link from "next/link";
import { copy } from "@/config/copy";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-48 max-w-7xl px-4 pb-16 sm:px-8">
      <div className="grid gap-12 border-t border-gold/25 pt-12 md:grid-cols-3">
        <div>
          <p className="font-caps text-2xl tracking-display text-ivory">{site.name}</p>
          <p className="mt-2 font-display text-lg text-ivory-muted italic">{site.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-3">
            {copy.navigation.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-placard text-ivory-muted">
          <p>Demonstration works are shown courtesy of The Metropolitan Museum of Art’s Open Access programme.</p>
          <p className="mt-3">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
