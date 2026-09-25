import { afterAll, describe, expect, it } from "vitest";
import { getArtist, getArtwork, getCollection, getExhibition } from "@/lib/catalog";
import { parseCollectionFilters } from "@/lib/catalog/filters";
import { db } from "@/lib/db";
import { cleanupTestRecords, makeArtwork, makeOrder } from "./helpers";

afterAll(cleanupTestRecords);

/* What visitors can and cannot see. */

describe("only what is on view is shown", () => {
  it("a draft is not in the gallery", async () => {
    const work = await makeArtwork({ published: false });
    expect(await getArtwork(work.slug)).toBeNull();
  });

  it("a work without its photograph is not in the gallery", async () => {
    const work = await makeArtwork({}, { image: false });
    expect(await getArtwork(work.slug)).toBeNull();
  });

  it("The Artist page shows only works on view", async () => {
    const draft = await makeArtwork({ published: false });
    const shown = await makeArtwork();
    const slugs = (await getArtist())!.works.map((w) => w.slug);
    expect(slugs).toContain(shown.slug);
    expect(slugs).not.toContain(draft.slug);
  });

  it("an exhibition shows only its works that are on view, in the curator's order", async () => {
    const [a, b, draft] = await Promise.all([makeArtwork(), makeArtwork(), makeArtwork({ published: false })]);
    const exhibition = await db.exhibition.create({
      data: {
        slug: `test-exhibition-${a.id}`,
        title: "Test exhibition",
        works: {
          create: [
            { artworkId: b.id, position: 10 },
            { artworkId: draft.id, position: 20 },
            { artworkId: a.id, position: 30 },
          ],
        },
      },
    });
    const shown = await getExhibition(exhibition.slug);
    expect(shown?.works.map((w) => w.slug)).toEqual([b.slug, a.slug]);

    const filtered = await getCollection(parseCollectionFilters({ exhibition: exhibition.slug }));
    expect(filtered.works.map((w) => w.slug)).toEqual([b.slug, a.slug]);
  });

  it("a hidden exhibition matches nothing", async () => {
    const work = await makeArtwork();
    const exhibition = await db.exhibition.create({
      data: {
        slug: `test-hidden-${work.id}`,
        title: "Hidden",
        published: false,
        works: { create: { artworkId: work.id } },
      },
    });
    expect(await getExhibition(exhibition.slug)).toBeNull();
    expect((await getCollection(parseCollectionFilters({ exhibition: exhibition.slug }))).total).toBe(0);
  });
});

describe("holds", () => {
  it("a work on hold shows as under consideration", async () => {
    const work = await makeArtwork();
    const order = await makeOrder(work.id);
    await db.artwork.update({
      where: { id: work.id },
      data: { status: "RESERVED", reservedUntil: new Date(Date.now() + 30 * 60_000), reservedOrderId: order.id },
    });
    expect((await getArtwork(work.slug))?.status).toBe("RESERVED");
  });

  it("a hold that has run out no longer counts", async () => {
    const work = await makeArtwork();
    const order = await makeOrder(work.id);
    await db.artwork.update({
      where: { id: work.id },
      data: { status: "RESERVED", reservedUntil: new Date(Date.now() - 60_000), reservedOrderId: order.id },
    });
    expect((await getArtwork(work.slug))?.status).toBe("AVAILABLE");
  });
});
