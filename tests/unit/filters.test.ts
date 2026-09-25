import { describe, expect, it } from "vitest";
import { collectionHref, hasActiveFilters, parseCollectionFilters, toRoman } from "@/lib/catalog/filters";

describe("parseCollectionFilters", () => {
  it("reads filters from the query string", () => {
    expect(
      parseCollectionFilters({
        exhibition: "nocturnes",
        artist: "edgar-degas",
        medium: "pastel",
        available: "1",
        room: "2",
      }),
    ).toEqual({ exhibition: "nocturnes", artist: "edgar-degas", medium: "pastel", available: true, room: 2 });
  });

  it("defaults to the whole collection, room I", () => {
    expect(parseCollectionFilters({})).toEqual({
      exhibition: undefined,
      artist: undefined,
      medium: undefined,
      available: false,
      room: 1,
    });
  });

  it("ignores malformed values instead of failing", () => {
    const filters = parseCollectionFilters({ artist: "<script>", medium: ["oil", "pastel"], room: "-4" });
    expect(filters.artist).toBeUndefined();
    expect(filters.medium).toBe("oil");
    expect(filters.room).toBe(1);
    expect(parseCollectionFilters({ room: "abc" }).room).toBe(1);
  });
});

describe("collectionHref", () => {
  const base = parseCollectionFilters({ exhibition: "nocturnes", room: "2" });

  it("changing a filter returns to the first room", () => {
    expect(collectionHref(base, { medium: "oil" })).toBe("/collection?exhibition=nocturnes&medium=oil");
  });

  it("can clear a filter", () => {
    expect(collectionHref(base, { exhibition: undefined })).toBe("/collection");
  });

  it("keeps filters when moving between rooms", () => {
    expect(collectionHref(base, { room: 3 })).toBe("/collection?exhibition=nocturnes&room=3");
  });

  it("knows when any filter is active", () => {
    expect(hasActiveFilters(parseCollectionFilters({}))).toBe(false);
    expect(hasActiveFilters(parseCollectionFilters({ available: "1" }))).toBe(true);
  });
});

describe("toRoman", () => {
  it("numbers rooms as a museum would", () => {
    expect([1, 2, 4, 9, 14, 40].map(toRoman)).toEqual(["I", "II", "IV", "IX", "XIV", "XL"]);
  });
});
