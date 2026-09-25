import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { cleanupTestRecords, makeArtwork, makeOrder } from "./helpers";

afterAll(cleanupTestRecords);

/*
 * Rules the database itself enforces, so no bug in application code can
 * break them (see the raw SQL in the first migration).
 */

describe("each work is unique", () => {
  it("refuses a second PAID order for the same work", async () => {
    const work = await makeArtwork();
    await makeOrder(work.id, { status: "PAID", paidAt: new Date() });
    await expect(makeOrder(work.id, { status: "PAID", paidAt: new Date() })).rejects.toThrow(/Unique constraint/);
  });

  it("allows any number of unpaid attempts", async () => {
    const work = await makeArtwork();
    await makeOrder(work.id, { status: "EXPIRED" });
    await makeOrder(work.id, { status: "CANCELLED" });
    await expect(makeOrder(work.id, { status: "PAID", paidAt: new Date() })).resolves.toBeTruthy();
  });
});

describe("one artist", () => {
  it("the gallery can never have a second artist", async () => {
    await expect(
      db.artist.create({ data: { slug: "a-second-artist", name: "A Second Artist", sortName: "Artist, A Second" } }),
    ).rejects.toThrow(/Unique constraint/);
  });

  it("a portrait is complete and described, or absent", async () => {
    const artist = await db.artist.findFirstOrThrow();
    await expect(
      db.artist.update({ where: { id: artist.id }, data: { portraitStorage: "LOCAL", portraitKey: "/x.jpg" } }),
    ).rejects.toThrow(/Artist_portrait_complete/);
  });
});

describe("the Entrance", () => {
  it("has room for only one featured work", async () => {
    const featured = await db.artwork.findFirst({ where: { featured: true }, select: { id: true } });
    await db.artwork.updateMany({ where: { featured: true }, data: { featured: false } });
    await makeArtwork({ featured: true });
    await expect(makeArtwork({ featured: true })).rejects.toThrow(/Unique constraint/);
    // Put the seed collection back as it was.
    await db.artwork.updateMany({ where: { featured: true }, data: { featured: false } });
    if (featured) await db.artwork.update({ where: { id: featured.id }, data: { featured: true } });
  });
});

describe("values that can never make sense", () => {
  it("a sold work must carry its sale date", async () => {
    await expect(makeArtwork({ status: "SOLD" })).rejects.toThrow(/Artwork_sold_has_date/);
  });

  it("a hold must say until when, and for which order", async () => {
    await expect(makeArtwork({ status: "RESERVED" })).rejects.toThrow(/Artwork_reserved_has_hold/);
  });

  it("prices and dimensions are positive", async () => {
    await expect(makeArtwork({ priceCents: 0 })).rejects.toThrow(/Artwork_price_positive/);
    await expect(makeArtwork({ widthMm: 0 })).rejects.toThrow(/Artwork_dimensions_positive/);
  });

  it("every photograph has a description", async () => {
    const work = await makeArtwork({}, { image: false });
    await expect(
      db.artworkImage.create({
        data: { artworkId: work.id, storage: "LOCAL", key: "/x.jpg", width: 10, height: 10, alt: "   " },
      }),
    ).rejects.toThrow(/ArtworkImage_has_alt/);
  });
});

describe("certificate numbers", () => {
  it("come from a sequence that never repeats", async () => {
    const next = async () =>
      Number((await db.$queryRaw<[{ n: bigint }]>`select nextval('certificate_number_seq') as n`)[0].n);
    const first = await next();
    expect(await next()).toBe(first + 1);
  });
});
