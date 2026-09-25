import "server-only";
import { featuredArtworkSlug, seedArtists, seedArtworks, seedExhibitions, seedMediums } from "@/data/seed-collection";
import { ROOM_SIZE, type CollectionFilters } from "./filters";
import type { Artist, ArtistRef, ArtistWithWorks, Artwork, ExhibitionRef, ExhibitionWithWorks, Medium } from "./types";

/*
 * Public read access to the collection. Phase 2 reads the typed seed data;
 * Phase 3 replaces the bodies of these functions with Prisma queries — the
 * signatures (and the async-ness) stay the same, so pages don't change.
 */

export type CollectionPage = {
  works: Artwork[];
  total: number;
  room: number;
  roomCount: number;
  /** The selected filter values resolved to names, for the summary sentence. */
  selected: { exhibition?: ExhibitionRef; artist?: ArtistRef; medium?: Medium };
};

export type FilterOptions = {
  exhibitions: ExhibitionRef[];
  artists: ArtistRef[];
  mediums: Medium[];
};

const byName = (a: { sortName: string }, b: { sortName: string }) => a.sortName.localeCompare(b.sortName);

export async function getCollection(filters: CollectionFilters): Promise<CollectionPage> {
  const exhibition = filters.exhibition ? seedExhibitions.find((e) => e.slug === filters.exhibition) : undefined;

  let works = exhibition
    ? exhibition.workSlugs.map((slug) => seedArtworks.find((w) => w.slug === slug)!)
    : [...seedArtworks];
  if (filters.exhibition && !exhibition) works = [];
  if (filters.artist) works = works.filter((w) => w.artist.slug === filters.artist);
  if (filters.medium) works = works.filter((w) => w.medium.slug === filters.medium);
  if (filters.available) works = works.filter((w) => w.status !== "SOLD");

  const total = works.length;
  const roomCount = Math.max(1, Math.ceil(total / ROOM_SIZE));
  const room = Math.min(filters.room, roomCount);
  const artist = seedArtists.find((a) => a.slug === filters.artist);
  const medium = Object.values(seedMediums).find((m) => m.slug === filters.medium);

  return {
    works: works.slice((room - 1) * ROOM_SIZE, room * ROOM_SIZE),
    total,
    room,
    roomCount,
    selected: {
      exhibition: exhibition && { slug: exhibition.slug, title: exhibition.title },
      artist: artist && { slug: artist.slug, name: artist.name },
      medium,
    },
  };
}

/** Only options that actually have works on the wall. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const artists = seedArtists
    .filter((a) => seedArtworks.some((w) => w.artist.slug === a.slug))
    .sort(byName)
    .map(({ slug, name }) => ({ slug, name }));
  const mediums = Object.values(seedMediums).filter((m) => seedArtworks.some((w) => w.medium.slug === m.slug));
  const exhibitions = seedExhibitions.map(({ slug, title }) => ({ slug, title }));
  return { exhibitions, artists, mediums };
}

export async function getArtwork(slug: string): Promise<Artwork | null> {
  return seedArtworks.find((w) => w.slug === slug) ?? null;
}

export async function getArtworkSlugs(): Promise<string[]> {
  return seedArtworks.map((w) => w.slug);
}

export async function getFeaturedArtwork(): Promise<Artwork> {
  return seedArtworks.find((w) => w.slug === featuredArtworkSlug) ?? seedArtworks[0];
}

/**
 * Other works to look at next: first from the same exhibitions, then by the
 * same artist, then the rest of the collection in hanging order.
 */
export async function getRelatedWorks(artwork: Artwork, limit = 3): Promise<Artwork[]> {
  const others = seedArtworks.filter((w) => w.slug !== artwork.slug);
  const exhibitionSlugs = new Set(artwork.exhibitions.map((e) => e.slug));
  const score = (w: Artwork) =>
    (w.exhibitions.some((e) => exhibitionSlugs.has(e.slug)) ? 2 : 0) + (w.artist.slug === artwork.artist.slug ? 1 : 0);
  return others
    .map((w, index) => ({ w, index, score: score(w) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ w }) => w);
}

export async function getArtists(): Promise<Array<Artist & { works: Artwork[] }>> {
  return [...seedArtists]
    .sort(byName)
    .map((a) => ({ ...a, works: seedArtworks.filter((w) => w.artist.slug === a.slug) }))
    .filter((a) => a.works.length > 0);
}

export async function getArtist(slug: string): Promise<ArtistWithWorks | null> {
  const found = seedArtists.find((a) => a.slug === slug);
  if (!found) return null;
  return { ...found, works: seedArtworks.filter((w) => w.artist.slug === slug) };
}

export async function getArtistSlugs(): Promise<string[]> {
  return (await getArtists()).map((a) => a.slug);
}

function withWorks({ workSlugs, ...exhibition }: (typeof seedExhibitions)[number]): ExhibitionWithWorks {
  return { ...exhibition, works: workSlugs.map((slug) => seedArtworks.find((w) => w.slug === slug)!) };
}

export async function getExhibitions(): Promise<ExhibitionWithWorks[]> {
  return seedExhibitions.map(withWorks);
}

export async function getExhibition(slug: string): Promise<ExhibitionWithWorks | null> {
  const found = seedExhibitions.find((e) => e.slug === slug);
  return found ? withWorks(found) : null;
}

export async function getExhibitionSlugs(): Promise<string[]> {
  return seedExhibitions.map((e) => e.slug);
}
