import Link from "next/link";
import { copy } from "@/config/copy";
import type { CollectionPage, FilterOptions } from "@/lib/catalog";
import { collectionHref, hasActiveFilters, type CollectionFilters as Filters } from "@/lib/catalog/filters";
import { FilterMenusAutoClose } from "./FilterMenusAutoClose";
import styles from "./CollectionFilters.module.css";

type Option = { label: string; href: string; current: boolean };

function FilterMenu({ label, value, options }: { label: string; value: string; options: Option[] }) {
  return (
    // `name` makes the menus exclusive: opening one closes the others.
    <details name="collection-filter" data-filter-menu="" className={styles.menu}>
      <summary className={styles.summary}>
        {label}
        <span className={styles.value}>{value}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      <ul className={styles.options}>
        {options.map((option) => (
          <li key={option.href}>
            <Link href={option.href} className={styles.option} aria-current={option.current ? "true" : undefined}>
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

function summarise(page: CollectionPage, filters: Filters): string {
  const { exhibition, medium } = page.selected;
  const parts = [`${page.total} ${page.total === 1 ? "work" : "works"}`];
  if (medium) parts.push(`in ${medium.name.toLowerCase()}`);
  if (exhibition) parts.push(`from ${exhibition.title}`);
  let sentence = parts.join(" ");
  if (filters.available) sentence += ", available to acquire";
  return `Showing ${sentence}.`;
}

type Props = { filters: Filters; options: FilterOptions; page: CollectionPage };

/** Filters as museum signage: small-caps labels, quiet dropdowns, all plain links. */
export function CollectionFilters({ filters, options, page }: Props) {
  const c = copy.collection;
  const { exhibition, medium } = page.selected;

  return (
    <nav aria-label={c.filterLabel} className="mx-auto max-w-5xl text-center">
      <div className={styles.bar}>
        <FilterMenu
          label={c.exhibition}
          value={exhibition?.title ?? c.all}
          options={[
            { label: c.allExhibitions, href: collectionHref(filters, { exhibition: undefined }), current: !exhibition },
            ...options.exhibitions.map((e) => ({
              label: e.title,
              href: collectionHref(filters, { exhibition: e.slug }),
              current: e.slug === exhibition?.slug,
            })),
          ]}
        />
        <span className={styles.dot} aria-hidden="true">
          ·
        </span>
        <FilterMenu
          label={c.medium}
          value={medium?.name ?? c.all}
          options={[
            { label: c.allMediums, href: collectionHref(filters, { medium: undefined }), current: !medium },
            ...options.mediums.map((m) => ({
              label: m.name,
              href: collectionHref(filters, { medium: m.slug }),
              current: m.slug === medium?.slug,
            })),
          ]}
        />
        <span className={styles.dot} aria-hidden="true">
          ·
        </span>
        <Link
          href={collectionHref(filters, { available: !filters.available })}
          className={styles.toggle}
          data-active={filters.available}
        >
          <span className={styles.box} aria-hidden="true" />
          {c.availableOnly}
          {filters.available && <span className="sr-only"> (selected)</span>}
        </Link>
      </div>

      <p className="mt-8 font-display text-lg text-ivory-muted italic" aria-live="polite">
        {summarise(page, filters)}
        {hasActiveFilters(filters) && (
          <>
            {" "}
            <Link
              href="/collection"
              className="text-ivory not-italic underline decoration-gold/50 underline-offset-4 transition-colors duration-500 hover:decoration-gold"
            >
              {c.clear}
            </Link>
          </>
        )}
      </p>
      <FilterMenusAutoClose />
    </nav>
  );
}
