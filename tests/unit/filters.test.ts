import { describe, expect, it } from "vitest";
import { collectionHref, hasActiveFilters, parseCollectionFilters, toRoman } from "@/lib/catalog/filters";

describe("parseCollectionFilters", () => {
  it("reads filters from the query string", () => {
    expect(
      parseCollectionFilters({
        exhibition: "the-weather-coast",
        medium: "watercolour",
        available: "1",
        room: "2",
      }),
    ).toEqual({ exhibition: "the-weather-coast", medium: "watercolour", available: true, room: 2 });
  });

  it("defaults to the whole collection, room I", () => {
    expect(parseCollectionFilters({})).toEqual({
      exhibition: undefined,
      medium: undefined,
      available: false,
      room: 1,
    });
  });

  it("ignores malformed values instead of failing", () => {
    const filters = parseCollectionFilters({ exhibition: "<script>", medium: ["oil", "watercolour"], room: "-4" });
    expect(filters.exhibition).toBeUndefined();
    expect(filters.medium).toBe("oil");
    expect(filters.room).toBe(1);
    expect(parseCollectionFilters({ room: "abc" }).room).toBe(1);
  });
});

describe("one artist", () => {
  it("has no artist filter; an old artist link shows the whole collection", () => {
    const filters = parseCollectionFilters({ artist: "edgar-degas" });
    expect(filters).not.toHaveProperty("artist");
    expect(hasActiveFilters(filters)).toBe(false);
    expect(collectionHref(filters)).toBe("/collection");
  });
});

describe("collectionHref", () => {
  const base = parseCollectionFilters({ exhibition: "the-weather-coast", room: "2" });

  it("changing a filter returns to the first room", () => {
    expect(collectionHref(base, { medium: "oil" })).toBe("/collection?exhibition=the-weather-coast&medium=oil");
  });

  it("can clear a filter", () => {
    expect(collectionHref(base, { exhibition: undefined })).toBe("/collection");
  });

  it("keeps filters when moving between rooms", () => {
    expect(collectionHref(base, { room: 3 })).toBe("/collection?exhibition=the-weather-coast&room=3");
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
