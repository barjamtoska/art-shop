import type { Metadata } from "next";
import { CollectionFilters } from "@/components/gallery/CollectionFilters";
import { Hang } from "@/components/gallery/Hang";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getCollection, getFilterOptions } from "@/lib/catalog";
import { collectionHref, parseCollectionFilters, toRoman } from "@/lib/catalog/filters";

export const metadata: Metadata = {
  title: copy.collection.title,
  description: "Paintings hung and lit as in a museum at night. Every work is unique.",
};

export default async function CollectionPage({ searchParams }: PageProps<"/collection">) {
  const filters = parseCollectionFilters(await searchParams);
  const [page, options] = await Promise.all([getCollection(filters), getFilterOptions()]);
  const c = copy.collection;

  return (
    <div className="px-4 sm:px-8">
      <header className="mx-auto max-w-3xl pt-10 pb-12 text-center sm:pt-16">
        <h1 className="text-5xl sm:text-6xl">{c.title}</h1>
        <p className="mt-5 font-display text-xl text-ivory-muted italic">{c.intro}</p>
      </header>

      <CollectionFilters filters={filters} options={options} page={page} />

      <section className="mt-24 sm:mt-32" aria-label={`${c.room} ${toRoman(page.room)}`}>
        {page.works.length > 0 ? (
          <Hang works={page.works} label={c.title} />
        ) : (
          <div className="mx-auto max-w-md py-24 text-center">
            <p className="font-display text-2xl text-ivory-muted italic">{c.empty}</p>
            <div className="mt-10">
              <QuietLink href="/collection">{c.showAll}</QuietLink>
            </div>
          </div>
        )}
      </section>

      {page.roomCount > 1 && (
        <nav aria-label="Rooms" className="mt-8 flex flex-col items-center gap-8 text-center">
          <p className="font-caps text-label tracking-caps text-ivory-muted">
            {c.room} {toRoman(page.room)} {c.of} {toRoman(page.roomCount)}
          </p>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-14">
            {page.room > 1 && (
              <QuietLink href={collectionHref(filters, { room: page.room - 1 })}>← {c.previousRoom}</QuietLink>
            )}
            {page.room < page.roomCount && (
              <QuietLink href={collectionHref(filters, { room: page.room + 1 })}>{c.nextRoom} →</QuietLink>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
