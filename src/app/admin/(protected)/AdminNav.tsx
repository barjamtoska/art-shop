"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/artworks", label: "Artworks" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/exhibitions", label: "Exhibitions" },
  { href: "/admin/mediums", label: "Mediums" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Enquiries" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto border-b border-gold/15">
      <ul className="flex gap-1 py-2 text-sm whitespace-nowrap">
        {sections.map(({ href, label }) => {
          const current = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className="block px-3 py-2 text-ivory-muted transition-colors duration-500 hover:text-ivory aria-[current=page]:text-ivory aria-[current=page]:underline aria-[current=page]:decoration-gold aria-[current=page]:underline-offset-8"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
