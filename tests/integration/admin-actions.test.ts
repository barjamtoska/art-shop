import { execFileSync } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cleanupTestRecords, makeArtwork, makeOrder } from "./helpers";

/*
 * Admin server actions against the real database. The session check and
 * page refresh are replaced; everything else, including Next.js's redirect
 * (which throws, carrying its target in `digest`), is real.
 */

const session = vi.hoisted(() => ({ signedIn: true }));

vi.mock("@/lib/admin", () => ({
  assertAdmin: async () => {
    if (!session.signedIn) throw new Error("Not authorised");
    return { id: "admin", email: "admin@example.com", name: "Admin" };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createArtwork, deleteArtwork, updateArtwork } = await import("@/app/admin/(protected)/artworks/actions");
const { updateExhibition } = await import("@/app/admin/(protected)/exhibitions/actions");
const { attachPortrait, removeDemoWorks, removePortrait, saveArtist } =
  await import("@/app/admin/(protected)/artist/actions");
const { revalidatePath } = await import("next/cache");

afterAll(cleanupTestRecords);
beforeEach(() => {
  session.signedIn = true;
  vi.mocked(revalidatePath).mockClear();
});

const idle = { status: "idle" as const };

async function artworkForm(work: Awaited<ReturnType<typeof makeArtwork>>, changes: Record<string, string | null> = {}) {
  const values: Record<string, string | null> = {
    title: work.title,
    slug: work.slug,
    mediumId: work.mediumId,
    mediumDescription: work.mediumDescription,
    yearLabel: work.yearLabel,
    height: String(work.heightMm / 10),
    width: String(work.widthMm / 10),
    depth: "",
    price: String(work.priceCents / 100),
    frameStyle: work.frameStyle,
    description: "A description.",
    provenance: "",
    inscription: "",
    framingNote: "",
    metaDescription: "",
    position: String(work.position),
    published: work.published ? "on" : null,
    featured: null,
    ...changes,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) if (value !== null) form.append(key, value);
  return form;
}

describe("artwork actions", () => {
  it("refuse anyone who is not signed in as an admin", async () => {
    session.signedIn = false;
    const work = await makeArtwork();
    await expect(updateArtwork(work.id, idle, await artworkForm(work, { title: "Changed" }))).rejects.toThrow(
      "Not authorised",
    );
    expect((await db.artwork.findUniqueOrThrow({ where: { id: work.id } })).title).toBe(work.title);
  });

  it("save edits and refresh the public site", async () => {
    const work = await makeArtwork();
    const result = await updateArtwork(
      work.id,
      idle,
      await artworkForm(work, { title: "A New Title", price: "52,500" }),
    );
    expect(result.status).toBe("success");
    const saved = await db.artwork.findUniqueOrThrow({ where: { id: work.id } });
    expect(saved.title).toBe("A New Title");
    expect(saved.priceCents).toBe(5_250_000);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("can never mark a work sold, whatever the form says", async () => {
    const work = await makeArtwork();
    await updateArtwork(work.id, idle, await artworkForm(work, { status: "SOLD", soldAt: new Date().toISOString() }));
    const saved = await db.artwork.findUniqueOrThrow({ where: { id: work.id } });
    expect(saved.status).toBe("AVAILABLE");
    expect(saved.soldAt).toBeNull();
  });

  it("will not put a work on view without its photograph", async () => {
    const work = await makeArtwork({ published: false }, { image: false });
    const result = await updateArtwork(work.id, idle, await artworkForm(work, { published: "on" }));
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.published).toBeDefined();
    expect((await db.artwork.findUniqueOrThrow({ where: { id: work.id } })).published).toBe(false);
  });

  it("explain what is wrong with the input, field by field", async () => {
    const work = await makeArtwork();
    const result = await updateArtwork(
      work.id,
      idle,
      await artworkForm(work, { price: "lots", height: "tall", title: "" }),
    );
    expect(result.status).toBe("error");
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(expect.arrayContaining(["price", "height", "title"]));
  });

  it("refuse a URL name another work already uses", async () => {
    const [first, second] = [await makeArtwork(), await makeArtwork()];
    const result = await updateArtwork(second.id, idle, await artworkForm(second, { slug: first.slug }));
    expect(result.fieldErrors?.slug).toBeDefined();
  });

  it("hang one work in the Entrance at a time", async () => {
    const before = await db.artwork.findFirst({ where: { featured: true }, select: { id: true } });
    const work = await makeArtwork();
    const result = await updateArtwork(work.id, idle, await artworkForm(work, { featured: "on" }));
    expect(result.status).toBe("success");
    const featured = await db.artwork.findMany({ where: { featured: true }, select: { id: true } });
    expect(featured).toEqual([{ id: work.id }]);
    // Put the seed collection back as it was.
    await db.artwork.update({ where: { id: work.id }, data: { featured: false } });
    if (before) await db.artwork.update({ where: { id: before.id }, data: { featured: true } });
  });

  it("create new works as drafts, whatever the form says", async () => {
    const template = await makeArtwork();
    const form = await artworkForm(template, { slug: "", title: `Test Work created ${template.id}`, published: "on" });
    const redirect = await createArtwork(idle, form).catch((error: { digest?: string }) => error.digest);
    expect(redirect).toMatch(/^NEXT_REDIRECT;.*;\/admin\/artworks\/[^;]+\?created=1;/);
    const created = await db.artwork.findFirstOrThrow({ where: { title: `Test Work created ${template.id}` } });
    expect(created.published).toBe(false);
    expect(created.slug).toBe(`test-work-created-${template.id.toLowerCase()}`);
  });

  it("keep works with orders on record", async () => {
    const work = await makeArtwork();
    await makeOrder(work.id, { status: "EXPIRED" });
    const result = await deleteArtwork(work.id);
    expect(result.status).toBe("error");
    expect(await db.artwork.findUnique({ where: { id: work.id } })).not.toBeNull();
  });
});

describe("exhibition actions", () => {
  it("hang the works in the order the curator chose", async () => {
    const [a, b, c] = [await makeArtwork(), await makeArtwork(), await makeArtwork()];
    const exhibition = await db.exhibition.create({ data: { slug: `test-order-${a.id}`, title: "Order test" } });
    const form = new FormData();
    for (const [key, value] of Object.entries({
      title: "Order test",
      subtitle: "",
      slug: exhibition.slug,
      statement: "",
    }))
      form.append(key, value);
    for (const id of [c.id, a.id, b.id]) form.append("workIds", id);

    const result = await updateExhibition(exhibition.id, idle, form);
    expect(result.status).toBe("success");
    const hung = await db.exhibitionWork.findMany({
      where: { exhibitionId: exhibition.id },
      orderBy: { position: "asc" },
    });
    expect(hung.map((w) => w.artworkId)).toEqual([c.id, a.id, b.id]);
  });

  it("refuse closing dates before opening dates", async () => {
    const exhibition = await db.exhibition.create({ data: { slug: `test-dates-${Date.now()}`, title: "Dates" } });
    const form = new FormData();
    for (const [key, value] of Object.entries({
      title: "Dates",
      subtitle: "",
      slug: exhibition.slug,
      statement: "",
      opensOn: "2027-03-01",
      closesOn: "2027-01-01",
    }))
      form.append(key, value);
    const result = await updateExhibition(exhibition.id, idle, form);
    expect(result.fieldErrors?.closesOn).toBeDefined();
  });
});

describe("when something goes wrong", () => {
  it("saving a work deleted in another window explains, instead of failing", async () => {
    const work = await makeArtwork();
    const form = await artworkForm(work, { title: "Too late" });
    await db.artwork.delete({ where: { id: work.id } });
    const result = await updateArtwork(work.id, idle, form);
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/no longer exists/);
  });
});

describe("the artist", () => {
  const profile = (changes: Record<string, string> = {}) => {
    const form = new FormData();
    const values = {
      name: "Winslow Homer",
      nationality: "American",
      lifeDates: "1836–1910",
      shortBio: "Painter of the sea.",
      biography: ["First paragraph.", "", "", "Second paragraph."].join("\n"),
      statement: "",
      ...changes,
    };
    for (const [key, value] of Object.entries(values)) form.append(key, value);
    return form;
  };

  it("saving updates the one profile, and never creates another", async () => {
    const before = await db.artist.findFirstOrThrow();
    const result = await saveArtist(idle, profile({ statement: "  I paint the sea.  " }));
    expect(result.status).toBe("success");
    expect(await db.artist.count()).toBe(1);
    const after = await db.artist.findFirstOrThrow();
    expect(after.id).toBe(before.id);
    expect(after.statement).toBe("I paint the sea.");
    expect(after.biography).toBe(["First paragraph.", "", "Second paragraph."].join("\n"));
    // Put the seed profile back.
    await db.artist.update({ where: { id: before.id }, data: before });
  });

  it("requires a name", async () => {
    const result = await saveArtist(idle, profile({ name: " " }));
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("takes a portrait only from the artist's own upload folder, and only described", async () => {
    const outside = await attachPortrait({ key: "/uploads/artworks/abc/photo.jpg", alt: "The artist in the studio." });
    expect(outside.status).toBe("error");
    const undescribed = await attachPortrait({ key: "/uploads/artist/x.jpg", alt: "" });
    expect(undescribed.fieldErrors?.alt).toBeDefined();

    const dir = path.join(process.cwd(), "public/uploads/artist");
    await mkdir(dir, { recursive: true });
    await copyFile(path.join(process.cwd(), "public/seed/fisherwomen.jpg"), path.join(dir, "test-portrait.jpg"));
    try {
      const result = await attachPortrait({
        key: "/uploads/artist/test-portrait.jpg",
        alt: "The artist on the shore.",
      });
      expect(result.status).toBe("success");
      const artist = await db.artist.findFirstOrThrow();
      expect(artist.portraitKey).toBe("/uploads/artist/test-portrait.jpg");
      expect(artist.portraitWidth).toBeGreaterThan(0);

      expect((await removePortrait()).status).toBe("success");
      expect((await db.artist.findFirstOrThrow()).portraitKey).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("removing the demonstration works keeps any work with an order", async () => {
    const kept = await db.artwork.findFirstOrThrow({ where: { isDemo: true } });
    await makeOrder(kept.id, { status: "EXPIRED" });
    try {
      const result = await removeDemoWorks();
      expect(result.status).toBe("success");
      const left = await db.artwork.findMany({ where: { isDemo: true }, select: { id: true } });
      expect(left).toEqual([{ id: kept.id }]);
    } finally {
      // Restore the demonstration collection for the other tests.
      await db.order.deleteMany({ where: { artworkId: kept.id } });
      await db.artwork.delete({ where: { id: kept.id } });
      execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "seed"], {
        env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
        stdio: "pipe",
      });
    }
  }, 60_000); // re-seeds the test database afterwards
});
