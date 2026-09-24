import Link from "next/link";
import type { ComponentProps } from "react";

/** Small-caps text link whose gold hairline extends on hover. Never a loud button. */
export function QuietLink({ className = "", children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`group relative inline-block pb-1 font-caps text-label tracking-caps text-ivory ${className}`}
    >
      {children}
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-[0.3] bg-gold/70 transition-transform duration-700 ease-gallery group-hover:scale-x-100 group-focus-visible:scale-x-100"
      />
    </Link>
  );
}

const quietButtonClass =
  "inline-flex items-center justify-center border border-gold/55 px-7 py-3 font-caps text-label tracking-caps text-ivory transition-[border-color,background-color] duration-700 ease-gallery hover:border-gold hover:bg-gold/10 focus-visible:border-gold disabled:cursor-not-allowed disabled:opacity-50";

/** The single, quiet action on a page — e.g. "Acquire this work". */
export function QuietButton({ className = "", ...props }: ComponentProps<"button">) {
  return <button {...props} className={`${quietButtonClass} ${className}`} />;
}
