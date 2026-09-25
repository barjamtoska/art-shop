"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/config/copy";

type Props = {
  variant: "bar" | "menu";
  /** Called when a link is chosen (the mobile menu closes itself). */
  onNavigate?: () => void;
};

const styles = {
  bar: {
    list: "flex items-center gap-10",
    link: "relative pb-1 font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 ease-gallery hover:text-ivory aria-[current=page]:text-ivory after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-gold/70 after:transition-transform after:duration-700 after:ease-gallery hover:after:scale-x-100 aria-[current=page]:after:scale-x-100",
  },
  menu: {
    list: "flex flex-col items-center gap-9",
    link: "font-display text-4xl font-light text-ivory-muted transition-colors duration-500 hover:text-ivory aria-[current=page]:text-ivory aria-[current=page]:italic",
  },
};

export function NavLinks({ variant, onNavigate }: Props) {
  const pathname = usePathname();
  const style = styles[variant];

  return (
    <ul className={style.list}>
      {copy.navigation.map(({ href, label }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link href={href} className={style.link} aria-current={current ? "page" : undefined} onClick={onNavigate}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
