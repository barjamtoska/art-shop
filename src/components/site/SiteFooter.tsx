import Link from "next/link";
import { copy } from "@/config/copy";
import { site } from "@/config/site";

const linkClass = "font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory";

export function SiteFooter() {
  const { contact } = site;
  return (
    <footer className="mx-auto mt-48 max-w-7xl px-4 pb-16 sm:px-8 print:hidden">
      <div className="grid gap-12 border-t border-gold/25 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-caps text-2xl tracking-display text-ivory">{site.name}</p>
          <p className="mt-2 font-display text-lg text-ivory-muted italic">{site.tagline}</p>
          <address className="mt-6 text-placard leading-relaxed text-ivory-muted not-italic">
            {contact.address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            <span className="mt-2 block">{contact.hours}</span>
            <a href={`mailto:${contact.email}`} className="mt-2 block w-fit hover:text-ivory">
              {contact.email}
            </a>
          </address>
        </div>
        <nav aria-label="Gallery">
          <ul className="space-y-3">
            {copy.navigation.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Information">
          <ul className="space-y-3">
            {copy.footerLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkClass}>
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
