import { describe, expect, it } from "vitest";
import { getArtist, getArtwork, getCollection, getExhibition, getFilterOptions, getRelatedWorks } from "@/lib/catalog";
import { parseCollectionFilters, ROOM_SIZE } from "@/lib/catalog/filters";

const filters = (params: Record<string, string> = {}) => parseCollectionFilters(params);

describe("getCollection", () => {
  it("hangs the whole collection across rooms", async () => {
    const first = await getCollection(filters());
    expect(first.total).toBeGreaterThan(ROOM_SIZE);
    expect(first.works).toHaveLength(ROOM_SIZE);
    expect(first.roomCount).toBe(Math.ceil(first.total / ROOM_SIZE));

    const second = await getCollection(filters({ room: "2" }));
    expect(second.works[0].slug).not.toBe(first.works[0].slug);
  });

  it("shows an exhibition's works in their curated order", async () => {
    const page = await getCollection(filters({ exhibition: "the-weather-coast" }));
    const exhibition = await getExhibition("the-weather-coast");
    expect(page.works.map((w) => w.slug)).toEqual(exhibition!.works.map((w) => w.slug));
    expect(page.selected.exhibition?.title).toBe("The Weather Coast");
  });

  it("combines filters", async () => {
    const page = await getCollection(filters({ medium: "watercolour", exhibition: "islands-in-the-sun" }));
    expect(page.total).toBeGreaterThan(0);
    expect(page.works.every((w) => w.medium.slug === "watercolour")).toBe(true);
    expect(page.works.every((w) => w.exhibitions.some((e) => e.slug === "islands-in-the-sun"))).toBe(true);
  });

  it("hides works in private collections when asked", async () => {
    const all = await getCollection(filters());
    const available = await getCollection(filters({ available: "1" }));
    expect(available.total).toBeLessThan(all.total);
    expect(available.works.some((w) => w.status === "SOLD")).toBe(false);
  });

  it("returns an empty room for an unknown exhibition", async () => {
    const page = await getCollection(filters({ exhibition: "not-an-exhibition" }));
    expect(page.total).toBe(0);
    expect(page.roomCount).toBe(1);
  });

  it("never shows a room past the last one", async () => {
    const page = await getCollection(filters({ room: "99" }));
    expect(page.room).toBe(page.roomCount);
    expect(page.works.length).toBeGreaterThan(0);
  });
});

describe("the rest of the catalogue", () => {
  it("offers only filter options that have works", async () => {
    const options = await getFilterOptions();
    for (const medium of options.mediums) {
      expect((await getCollection(filters({ medium: medium.slug }))).total).toBeGreaterThan(0);
    }
  });

  it("finds works and exhibitions by slug", async () => {
    expect((await getArtwork("the-veteran-in-a-new-field"))?.status).toBe("SOLD");
    expect(await getArtwork("nope")).toBeNull();
    expect(await getExhibition("nope")).toBeNull();
  });

  it("shows one artist, whose works are the whole collection", async () => {
    const artist = await getArtist();
    const collection = await getCollection(filters());
    expect(artist?.name).toBe("Winslow Homer");
    expect(artist?.biography.length).toBeGreaterThan(0);
    expect(artist?.works).toHaveLength(collection.total);
    expect(collection.works.every((w) => w.artist.name === "Winslow Homer")).toBe(true);
  });

  it("suggests related works from the same exhibition first, never the work itself", async () => {
    const work = (await getArtwork("maine-coast"))!;
    const related = await getRelatedWorks(work, 3);
    expect(related).toHaveLength(3);
    expect(related.map((w) => w.slug)).not.toContain(work.slug);
    expect(related.every((w) => w.exhibitions.some((e) => e.slug === "the-weather-coast"))).toBe(true);
  });

  it("every seed work has alt text and a description", async () => {
    const all = await getCollection(filters({ room: "1" }));
    const rest = await getCollection(filters({ room: "2" }));
    for (const work of [...all.works, ...rest.works]) {
      expect(work.image.alt.length).toBeGreaterThan(30);
      expect(work.description.length).toBeGreaterThan(0);
      expect(work.isDemo).toBe(true);
    }
  });
});
