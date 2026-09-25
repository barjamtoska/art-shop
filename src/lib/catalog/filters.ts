/**
 * Collection filters live in the URL, so every view of the collection can be
 * linked, bookmarked and rendered on the server without JavaScript.
 *   /collection?exhibition=the-weather-coast&medium=oil&available=1&room=2
 * (One artist shows here, so there is no artist filter; an old `artist`
 * parameter is simply ignored.)
 */

export type CollectionFilters = {
  exhibition?: string;
  medium?: string;
  /** Hide works in private collections. */
  available: boolean;
  /** 1-based "room" (page) of the collection. */
  room: number;
};

/** Works per room. Few, so each has space on the wall. */
export const ROOM_SIZE = 8;

type SearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9-]{1,80}$/;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function slugParam(value: string | string[] | undefined): string | undefined {
  const v = single(value);
  return v && SLUG.test(v) ? v : undefined;
}

export function parseCollectionFilters(params: SearchParams): CollectionFilters {
  const room = Number.parseInt(single(params.room) ?? "1", 10);
  return {
    exhibition: slugParam(params.exhibition),
    medium: slugParam(params.medium),
    available: single(params.available) === "1",
    room: Number.isFinite(room) && room > 1 && room < 1000 ? room : 1,
  };
}

export function hasActiveFilters(filters: CollectionFilters): boolean {
  return Boolean(filters.exhibition || filters.medium || filters.available);
}

/**
 * Link to the collection with some filters changed. Changing any filter
 * returns to the first room; `undefined` clears a filter.
 */
export function collectionHref(current: CollectionFilters, changes: Partial<CollectionFilters> = {}): string {
  const next = { ...current, room: 1, ...changes };
  const params = new URLSearchParams();
  if (next.exhibition) params.set("exhibition", next.exhibition);
  if (next.medium) params.set("medium", next.medium);
  if (next.available) params.set("available", "1");
  if (next.room > 1) params.set("room", String(next.room));
  const query = params.toString();
  return query ? `/collection?${query}` : "/collection";
}

const ROMAN: Array<[number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Rooms are numbered as a museum would: Room I, Room II… */
export function toRoman(n: number): string {
  let rest = Math.floor(n);
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (rest >= value) {
      out += numeral;
      rest -= value;
    }
  }
  return out;
}
