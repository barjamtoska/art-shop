import "server-only";
import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { displaySrc, zoomSrc } from "@/lib/images";
import { ROOM_SIZE, type CollectionFilters } from "./filters";
import type {
  ArtistWithWorks,
  Artwork,
  ArtworkStatus,
  Exhibition,
  ExhibitionRef,
  ExhibitionWithWorks,
  Medium,
} from "./types";

/*
 * Public read access to the collection: the work of one artist, the
 * gallery's owner. Only published works and exhibitions are ever returned. Pages depend on the domain types in
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
  selected: { exhibition?: ExhibitionRef; medium?: Medium };
};

export type FilterOptions = {
  exhibitions: ExhibitionRef[];
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

/** Works on view in the gallery. */
const onView = { published: true } satisfies Prisma.ArtworkWhereInput;

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
  const [exhibition, medium] = await Promise.all([
    filters.exhibition
      ? db.exhibition.findFirst({
          where: { slug: filters.exhibition, published: true },
          select: { slug: true, title: true },
        })
      : null,
    filters.medium
      ? db.medium.findUnique({ where: { slug: filters.medium }, select: { slug: true, name: true } })
      : null,
  ]);
  const selected = { exhibition: exhibition ?? undefined, medium: medium ?? undefined };

  // A filter naming something that isn't on view matches nothing.
  const unknown = (filters.exhibition && !exhibition) || (filters.medium && !medium);
  if (unknown) return { works: [], total: 0, room: 1, roomCount: 1, selected };

  const where: Prisma.ArtworkWhereInput = {
    ...onView,
    ...withImage,
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
  const [exhibitions, mediums] = await Promise.all([
    db.exhibition.findMany({
      where: { published: true, works: { some: { artwork: { ...onView, ...withImage } } } },
      orderBy: { position: "asc" },
      select: { slug: true, title: true },
    }),
    db.medium.findMany({ where: { artworks: hasWorks }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
  ]);
  return { exhibitions, mediums };
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
 * Other works to look at next: first from the same exhibitions, then the
 * rest of the collection in hanging order.
 */
export async function getRelatedWorks(artwork: Artwork, limit = 3): Promise<Artwork[]> {
  const exhibitionSlugs = artwork.exhibitions.map((e) => e.slug);
  const base = { ...onView, ...withImage, slug: { not: artwork.slug } } satisfies Prisma.ArtworkWhereInput;

  let rows = exhibitionSlugs.length
    ? await db.artwork.findMany({
        where: { ...base, exhibitions: { some: { exhibition: { slug: { in: exhibitionSlugs } } } } },
        include: artworkInclude,
        orderBy: byHangingOrder,
        take: limit,
      })
    : [];
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

// ---------------------------------------------------------------- The artist

const artistWorks = {
  artworks: { where: { ...onView, ...withImage }, include: artworkInclude, orderBy: byHangingOrder },
} satisfies Prisma.ArtistInclude;

/** The gallery's artist (there is only ever one), with the works on view. */
export const getArtist = cache(async (): Promise<ArtistWithWorks | null> => {
  const row = await db.artist.findFirst({ include: artistWorks });
  if (!row) return null;
  const now = new Date();
  const portrait =
    row.portraitStorage && row.portraitKey && row.portraitWidth && row.portraitHeight
      ? {
          src: displaySrc({ storage: row.portraitStorage, key: row.portraitKey }),
          width: row.portraitWidth,
          height: row.portraitHeight,
          alt: row.portraitAlt ?? "",
        }
      : undefined;
  return {
    slug: row.slug,
    name: row.name,
    sortName: row.sortName,
    lifeDates: row.lifeDates,
    nationality: row.nationality,
    shortBio: row.shortBio,
    biography: toParagraphs(row.biography),
    statement: toParagraphs(row.statement),
    portrait,
    works: row.artworks.map((work) => toArtwork(work, now)),
  };
});

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
