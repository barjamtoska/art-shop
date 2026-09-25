import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { displaySrc, zoomSrc } from "@/lib/images";
import { ROOM_SIZE, type CollectionFilters } from "./filters";
import type {
  ArtistRef,
  ArtistWithWorks,
  Artwork,
  ArtworkStatus,
  Exhibition,
  ExhibitionRef,
  ExhibitionWithWorks,
  Medium,
} from "./types";

/*
 * Public read access to the collection. Only published works, artists and
 * exhibitions are ever returned. Pages depend on the domain types in
 * ./types, never on Prisma's shapes; `toArtwork` and friends translate.
 *
 * Public pages are statically generated from these reads and refreshed when
 * the catalogue changes (see ./refresh.ts). `cache` dedupes identical reads
 * within one render (a page and its metadata ask for the same work).
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

// ---------------------------------------------------------------- Mapping

const artworkInclude = {
  artist: { select: { slug: true, name: true } },
  medium: { select: { slug: true, name: true } },
  images: { where: { kind: "PRIMARY" }, orderBy: { position: "asc" }, take: 1 },
  exhibitions: {
    where: { exhibition: { published: true } },
    orderBy: { exhibition: { position: "asc" } },
    select: { exhibition: { select: { slug: true, title: true } } },
  },
} satisfies Prisma.ArtworkInclude;

type ArtworkRow = Prisma.ArtworkGetPayload<{ include: typeof artworkInclude }>;

/** Only published works whose artist is published too. */
const onView = { published: true, artist: { published: true } } satisfies Prisma.ArtworkWhereInput;

const byHangingOrder = [{ position: "asc" }, { createdAt: "asc" }] satisfies Prisma.ArtworkOrderByWithRelationInput[];

/** Paragraphs are stored separated by a blank line. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** A hold that has run out no longer counts: the work is available again. */
function displayStatus(status: ArtworkStatus, reservedUntil: Date | null, now: Date): ArtworkStatus {
  if (status === "RESERVED" && (!reservedUntil || reservedUntil <= now)) return "AVAILABLE";
  return status;
}

const isoDate = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);

function toArtwork(row: ArtworkRow, now = new Date()): Artwork {
  const image = row.images[0];
  if (!image) throw new Error(`Artwork "${row.slug}" has no primary image`);
  return {
    slug: row.slug,
    title: row.title,
    yearLabel: row.yearLabel,
    artist: row.artist,
    medium: row.medium,
    mediumDescription: row.mediumDescription,
    heightCm: row.heightMm / 10,
    widthCm: row.widthMm / 10,
    depthCm: row.depthMm ? row.depthMm / 10 : undefined,
    priceCents: row.priceCents,
    status: displayStatus(row.status, row.reservedUntil, now),
    frameStyle: row.frameStyle,
    image: {
      src: displaySrc(image),
      zoomSrc: zoomSrc(image),
      width: image.width,
      height: image.height,
      alt: image.alt,
      blurDataURL: image.blurDataUrl ?? undefined,
      credit: image.credit ?? undefined,
    },
    metaDescription: row.metaDescription ?? undefined,
    description: toParagraphs(row.description),
    inscription: row.inscription ?? undefined,
    framingNote: row.framingNote ?? undefined,
    exhibitions: row.exhibitions.map((e) => e.exhibition),
    isDemo: row.isDemo,
  };
}

/** Works without an image cannot hang; they stay in the admin until one is added. */
const withImage = { images: { some: { kind: "PRIMARY" } } } satisfies Prisma.ArtworkWhereInput;

// ---------------------------------------------------------------- Collection

export async function getCollection(filters: CollectionFilters): Promise<CollectionPage> {
  const [exhibition, artist, medium] = await Promise.all([
    filters.exhibition
      ? db.exhibition.findFirst({
          where: { slug: filters.exhibition, published: true },
          select: { slug: true, title: true },
        })
      : null,
    filters.artist
      ? db.artist.findFirst({ where: { slug: filters.artist, published: true }, select: { slug: true, name: true } })
      : null,
    filters.medium
      ? db.medium.findUnique({ where: { slug: filters.medium }, select: { slug: true, name: true } })
      : null,
  ]);
  const selected = { exhibition: exhibition ?? undefined, artist: artist ?? undefined, medium: medium ?? undefined };

  // A filter naming something that isn't on view matches nothing.
  const unknown = (filters.exhibition && !exhibition) || (filters.artist && !artist) || (filters.medium && !medium);
  if (unknown) return { works: [], total: 0, room: 1, roomCount: 1, selected };

  const where: Prisma.ArtworkWhereInput = {
    ...onView,
    ...withImage,
    ...(artist && { artist: { slug: artist.slug, published: true } }),
    ...(medium && { medium: { slug: medium.slug } }),
    ...(filters.available && { status: { not: "SOLD" } }),
    ...(exhibition && { exhibitions: { some: { exhibition: { slug: exhibition.slug } } } }),
  };

  const total = await db.artwork.count({ where });
  const roomCount = Math.max(1, Math.ceil(total / ROOM_SIZE));
  const room = Math.min(filters.room, roomCount);
  const page = { skip: (room - 1) * ROOM_SIZE, take: ROOM_SIZE };

  let rows: ArtworkRow[];
  if (exhibition) {
    // Within an exhibition, works hang in the curator's order.
    const hung = await db.exhibitionWork.findMany({
      where: { exhibition: { slug: exhibition.slug }, artwork: where },
      orderBy: [{ position: "asc" }, { artwork: { position: "asc" } }],
      include: { artwork: { include: artworkInclude } },
      ...page,
    });
    rows = hung.map((h) => h.artwork);
  } else {
    rows = await db.artwork.findMany({ where, include: artworkInclude, orderBy: byHangingOrder, ...page });
  }

  const now = new Date();
  return { works: rows.map((row) => toArtwork(row, now)), total, room, roomCount, selected };
}

/** Only options that actually have works on the wall. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const hasWorks = { some: { ...onView, ...withImage } } satisfies Prisma.ArtworkListRelationFilter;
  const [exhibitions, artists, mediums] = await Promise.all([
    db.exhibition.findMany({
      where: { published: true, works: { some: { artwork: { ...onView, ...withImage } } } },
      orderBy: { position: "asc" },
      select: { slug: true, title: true },
    }),
    db.artist.findMany({
      where: { published: true, artworks: hasWorks },
      orderBy: { sortName: "asc" },
      select: { slug: true, name: true },
    }),
    db.medium.findMany({ where: { artworks: hasWorks }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  return { exhibitions, artists, mediums };
}

// ---------------------------------------------------------------- Works

export const getArtwork = cache(async (slug: string): Promise<Artwork | null> => {
  const row = await db.artwork.findFirst({ where: { slug, ...onView, ...withImage }, include: artworkInclude });
  return row ? toArtwork(row) : null;
});

export async function getArtworkSlugs(): Promise<string[]> {
  const rows = await db.artwork.findMany({ where: { ...onView, ...withImage }, select: { slug: true } });
  return rows.map((r) => r.slug);
}

/** The work on the Entrance: the featured one, else the first in the hang. */
export async function getFeaturedArtwork(): Promise<Artwork | null> {
  const row =
    (await db.artwork.findFirst({ where: { featured: true, ...onView, ...withImage }, include: artworkInclude })) ??
    (await db.artwork.findFirst({
      where: { ...onView, ...withImage },
      include: artworkInclude,
      orderBy: byHangingOrder,
    }));
  return row ? toArtwork(row) : null;
}

/**
 * Other works to look at next: first from the same exhibitions, then by the
 * same artist, then the rest of the collection in hanging order.
 */
export async function getRelatedWorks(artwork: Artwork, limit = 3): Promise<Artwork[]> {
  const exhibitionSlugs = artwork.exhibitions.map((e) => e.slug);
  const base = { ...onView, ...withImage, slug: { not: artwork.slug } } satisfies Prisma.ArtworkWhereInput;

  const close = await db.artwork.findMany({
    where: {
      ...base,
      OR: [
        { exhibitions: { some: { exhibition: { slug: { in: exhibitionSlugs } } } } },
        { artist: { slug: artwork.artist.slug } },
      ],
    },
    include: artworkInclude,
    orderBy: byHangingOrder,
  });
  const score = (row: ArtworkRow) =>
    (row.exhibitions.some((e) => exhibitionSlugs.includes(e.exhibition.slug)) ? 2 : 0) +
    (row.artist.slug === artwork.artist.slug ? 1 : 0);
  // Stable sort: equal scores keep hanging order.
  const picked = close
    .map((row, index) => ({ row, index }))
    .sort((a, b) => score(b.row) - score(a.row) || a.index - b.index);

  let rows = picked.slice(0, limit).map((p) => p.row);
  if (rows.length < limit) {
    const rest = await db.artwork.findMany({
      where: { ...base, slug: { notIn: [artwork.slug, ...rows.map((r) => r.slug)] } },
      include: artworkInclude,
      orderBy: byHangingOrder,
      take: limit - rows.length,
    });
    rows = [...rows, ...rest];
  }
  const now = new Date();
  return rows.map((row) => toArtwork(row, now));
}

// ---------------------------------------------------------------- Artists

const artistWorks = {
  artworks: { where: { published: true, ...withImage }, include: artworkInclude, orderBy: byHangingOrder },
} satisfies Prisma.ArtistInclude;

type ArtistRow = Prisma.ArtistGetPayload<{ include: typeof artistWorks }>;

function toArtist({ artworks, biography, ...artist }: ArtistRow, now = new Date()): ArtistWithWorks {
  return {
    slug: artist.slug,
    name: artist.name,
    sortName: artist.sortName,
    lifeDates: artist.lifeDates,
    nationality: artist.nationality,
    shortBio: artist.shortBio,
    biography: toParagraphs(biography),
    works: artworks.map((row) => toArtwork(row, now)),
  };
}

/** Artists with at least one work on view, alphabetically. */
export async function getArtists(): Promise<ArtistWithWorks[]> {
  const rows = await db.artist.findMany({
    where: { published: true, artworks: { some: { published: true, ...withImage } } },
    include: artistWorks,
    orderBy: { sortName: "asc" },
  });
  const now = new Date();
  return rows.map((row) => toArtist(row, now));
}

export const getArtist = cache(async (slug: string): Promise<ArtistWithWorks | null> => {
  const row = await db.artist.findFirst({ where: { slug, published: true }, include: artistWorks });
  return row ? toArtist(row) : null;
});

export async function getArtistSlugs(): Promise<string[]> {
  return (await getArtists()).map((a) => a.slug);
}

// ---------------------------------------------------------------- Exhibitions

const exhibitionWorks = {
  works: {
    where: { artwork: { ...onView, ...withImage } },
    orderBy: { position: "asc" },
    include: { artwork: { include: artworkInclude } },
  },
} satisfies Prisma.ExhibitionInclude;

type ExhibitionRow = Prisma.ExhibitionGetPayload<{ include: typeof exhibitionWorks }>;

function toExhibition(row: ExhibitionRow, now = new Date()): ExhibitionWithWorks {
  const exhibition: Exhibition = {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    statement: toParagraphs(row.statement),
    opensOn: isoDate(row.opensOn),
    closesOn: isoDate(row.closesOn),
  };
  return { ...exhibition, works: row.works.map((w) => toArtwork(w.artwork, now)) };
}

export async function getExhibitions(): Promise<ExhibitionWithWorks[]> {
  const rows = await db.exhibition.findMany({
    where: { published: true },
    include: exhibitionWorks,
    orderBy: { position: "asc" },
  });
  const now = new Date();
  return rows.map((row) => toExhibition(row, now));
}

export const getExhibition = cache(async (slug: string): Promise<ExhibitionWithWorks | null> => {
  const row = await db.exhibition.findFirst({ where: { slug, published: true }, include: exhibitionWorks });
  return row ? toExhibition(row) : null;
});

export async function getExhibitionSlugs(): Promise<string[]> {
  const rows = await db.exhibition.findMany({ where: { published: true }, select: { slug: true } });
  return rows.map((r) => r.slug);
}
