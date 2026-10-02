import type { ReactNode } from "react";
import { pagesReviewed, type TextPage as Page } from "@/content/pages";

/**
 * A quiet page of text (About, Shipping & returns, Terms, Privacy).
 * `literary` sets it like an exhibition statement; otherwise it is set for
 * easy reading of practical and legal detail.
 */
export function TextPage({
  page,
  literary = false,
  children,
}: {
  page: Page;
  literary?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className="px-4 pt-10 sm:px-8 sm:pt-16">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl sm:text-6xl">{page.title}</h1>
        <p className="mt-5 font-display text-xl text-ivory-muted italic">{page.intro}</p>
      </header>

      {!pagesReviewed && (
        <p role="note" className="mx-auto mt-10 max-w-prose border border-notice/40 px-4 py-3 text-sm text-notice">
          Draft text, to be reviewed before launch.
        </p>
      )}

      <div className="mx-auto mt-14 max-w-prose space-y-14">
        {page.sections.map((section, index) => (
          <section key={section.heading ?? index} aria-labelledby={section.heading ? `section-${index}` : undefined}>
            {section.heading && (
              <h2 id={`section-${index}`} className="font-caps text-label tracking-caps text-ivory-muted">
                {section.heading}
              </h2>
            )}
            <div
              className={
                literary
                  ? "mt-6 space-y-5 font-display text-xl leading-relaxed text-ivory"
                  : "mt-4 space-y-4 leading-relaxed text-ivory"
              }
            >
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
        {children}
      </div>
    </article>
  );
}
