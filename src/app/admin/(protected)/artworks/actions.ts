"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors, transactionOptions } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, withBlankFields, type FormState } from "@/lib/admin-form";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import {
  RECOMMENDED_LONG_EDGE,
  deleteStoredImage,
  uploadTarget,
  verifyUpload,
  type UploadTarget,
} from "@/lib/image-upload";
import { SLUG_PATTERN, normaliseParagraphs, parseCentimetres, parseEuros, slugify } from "@/lib/parse";

/*
 * Artwork edits. What these actions deliberately cannot do: change a work's
 * sale status. A work becomes SOLD only through a verified Stripe webhook,
 * and holds are placed and released only by checkout (Phase 4).
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `At most ${max} characters.`)
    .transform((value) => value || null);

const centimetres = (label: string) =>
  z.string().transform((value, ctx) => {
    const mm = parseCentimetres(value);
    if (mm === null) ctx.addIssue({ code: "custom", message: `Enter the ${label} in centimetres, e.g. 45.7.` });
    return mm ?? 0;
  });

const artworkSchema = z.object({
  title: z.string().trim().min(1, "A title is required.").max(200),
  slug: z
    .string()
    .trim()
    .max(80)
    .refine((value) => value === "" || SLUG_PATTERN.test(value), "Lowercase letters, numbers and hyphens only."),
  mediumId: z.string().min(1, "Choose the medium."),
  mediumDescription: z.string().trim().min(1, "Describe the medium, e.g. “Oil on canvas”.").max(200),
  yearLabel: z.string().trim().min(1, "Give the date, e.g. “c. 1662”.").max(40),
  height: centimetres("height"),
  width: centimetres("width"),
  depth: z.string().transform((value, ctx) => {
    if (!value.trim()) return null;
    const mm = parseCentimetres(value);
    if (mm === null) ctx.addIssue({ code: "custom", message: "Enter the depth in centimetres, or leave it empty." });
    return mm;
  }),
  price: z.string().transform((value, ctx) => {
    const cents = parseEuros(value);
    if (cents === null || cents <= 0)
      ctx.addIssue({ code: "custom", message: "Enter the price in euros, e.g. 48000." });
    return cents ?? 0;
  }),
  frameStyle: z.enum(["CLASSIC", "SLIM"]),
  description: z.string().transform(normaliseParagraphs),
  provenance: optionalText(2000),
  inscription: optionalText(500),
  framingNote: optionalText(500),
  metaDescription: optionalText(300),
  position: z.coerce.number().int("A whole number.").min(0).max(1_000_000),
  published: z.boolean(),
  featured: z.boolean(),
  exhibitionIds: z.array(z.string()),
});

function parseArtwork(formData: FormData) {
  const values = formValues(formData);
  const list = (key: string) => [values[key] ?? []].flat();
  return artworkSchema.safeParse({
    ...withBlankFields(artworkSchema, values),
    depth: values.depth ?? "",
    position: values.position || "0",
    published: values.published === "on",
    featured: values.featured === "on",
    exhibitionIds: list("exhibitionIds"),
  });
}

type ArtworkInput = z.infer<typeof artworkSchema>;

function artworkData(input: ArtworkInput) {
  return {
    title: input.title,
    slug: input.slug || slugify(input.title),
    mediumId: input.mediumId,
    mediumDescription: input.mediumDescription,
    yearLabel: input.yearLabel,
    heightMm: input.height,
    widthMm: input.width,
    depthMm: input.depth,
    priceCents: input.price,
    frameStyle: input.frameStyle,
    description: input.description,
    provenance: input.provenance,
    inscription: input.inscription,
    framingNote: input.framingNote,
    metaDescription: input.metaDescription,
    position: input.position,
  };
}

/** Rules that need the database, shared by create and update. */
async function checkRules(input: ArtworkInput, artworkId?: string): Promise<FormState | null> {
  const slug = input.slug || slugify(input.title);
  if (!slug) return failed("Please check the highlighted fields.", { slug: ["Give the work a URL name."] });
  const clash = await db.artwork.findFirst({ where: { slug, id: { not: artworkId } }, select: { id: true } });
  if (clash)
    return failed("Please check the highlighted fields.", { slug: ["Another work already uses this URL name."] });

  if (input.published || input.featured) {
    const image = artworkId
      ? await db.artworkImage.findFirst({ where: { artworkId, kind: "PRIMARY" }, select: { id: true } })
      : null;
    if (!image) {
      return failed("Add an image before putting the work on view.", {
        published: ["A work needs its photograph before it can go on view."],
      });
    }
  }
  if (input.featured && !input.published) {
    return failed("Please check the highlighted fields.", {
      featured: ["Only a work on view can hang in the Entrance."],
    });
  }
  return null;
}

/** Keeps the work's exhibitions as selected; new ones hang at the end of each exhibition. */
async function syncExhibitions(tx: Prisma.TransactionClient, artworkId: string, exhibitionIds: string[]) {
  await tx.exhibitionWork.deleteMany({ where: { artworkId, exhibitionId: { notIn: exhibitionIds } } });
  for (const exhibitionId of exhibitionIds) {
    const last = await tx.exhibitionWork.aggregate({ where: { exhibitionId }, _max: { position: true } });
    await tx.exhibitionWork.upsert({
      where: { exhibitionId_artworkId: { exhibitionId, artworkId } },
      update: {},
      create: { exhibitionId, artworkId, position: (last._max.position ?? 0) + 10 },
    });
  }
}

export async function createArtwork(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const parsed = parseArtwork(formData);
    if (!parsed.success) return invalid(parsed.error);
    // A new work has no photograph yet, so it always starts as a draft.
    const input = { ...parsed.data, published: false, featured: false };
    const problem = await checkRules(input);
    if (problem) return problem;

    // Every work is by the gallery's one artist.
    const artist = await db.artist.findFirst({ select: { id: true } });
    if (!artist) return failed("Set up the artist's profile first (The artist), then add works.");

    const artwork = await db.$transaction(async (tx) => {
      const created = await tx.artwork.create({
        data: { ...artworkData(input), artistId: artist.id, published: false },
      });
      await syncExhibitions(tx, created.id, input.exhibitionIds);
      return created;
    }, transactionOptions);
    refreshCatalogue();
    redirect(`/admin/artworks/${artwork.id}?created=1`);
  });
}

export async function updateArtwork(artworkId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    if (!(await db.artwork.findUnique({ where: { id: artworkId }, select: { id: true } }))) {
      return failed("This work no longer exists. It may have been deleted in another window.");
    }
    const parsed = parseArtwork(formData);
    if (!parsed.success) return invalid(parsed.error);
    const input = parsed.data;
    const problem = await checkRules(input, artworkId);
    if (problem) return problem;

    await db.$transaction(async (tx) => {
      // Only one work hangs in the Entrance (also enforced by a unique index).
      if (input.featured)
        await tx.artwork.updateMany({ where: { featured: true, id: { not: artworkId } }, data: { featured: false } });
      await tx.artwork.update({
        where: { id: artworkId },
        data: { ...artworkData(input), published: input.published, featured: input.featured },
      });
      await syncExhibitions(tx, artworkId, input.exhibitionIds);
    }, transactionOptions);
    refreshCatalogue();
    return saved(input.published ? "Saved. The work is on view." : "Saved as a draft (not on view).");
  });
}

export async function deleteArtwork(artworkId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const artwork = await db.artwork.findUnique({
      where: { id: artworkId },
      select: { status: true, _count: { select: { orders: true } }, images: { select: { storage: true, key: true } } },
    });
    if (!artwork) return failed("That work no longer exists.");
    if (artwork._count.orders > 0 || artwork.status !== "AVAILABLE") {
      return failed("This work has orders or a sale on record, so it cannot be deleted. Take it off view instead.");
    }
    await db.artwork.delete({ where: { id: artworkId } });
    await Promise.all(artwork.images.map(deleteStoredImage));
    refreshCatalogue();
    redirect("/admin/artworks?deleted=1");
  });
}

// ---------------------------------------------------------------- Images

export async function prepareImageUpload(artworkId: string): Promise<UploadTarget> {
  await assertAdmin();
  return uploadTarget(`artworks/${artworkId}`);
}

const imageDetailsSchema = z.object({
  alt: z
    .string()
    .trim()
    .min(20, "Describe the painting for someone who cannot see it (at least a sentence).")
    .max(600, "Keep it under 600 characters."),
  credit: optionalText(300),
});

/** Attaches a verified upload as the work's photograph, replacing any previous one. */
export async function attachArtworkImage(
  artworkId: string,
  upload: { key: string; alt: string; credit: string },
): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const details = imageDetailsSchema.safeParse(upload);
    if (!details.success) return invalid(details.error);

    let image;
    try {
      image = await verifyUpload(`artworks/${artworkId}`, upload.key);
    } catch (error) {
      return failed(error instanceof Error ? error.message : "The upload could not be verified.");
    }

    const previous = await db.$transaction(async (tx) => {
      const old = await tx.artworkImage.findMany({ where: { artworkId, kind: "PRIMARY" } });
      await tx.artworkImage.deleteMany({ where: { artworkId, kind: "PRIMARY" } });
      await tx.artworkImage.create({ data: { artworkId, kind: "PRIMARY", ...image, ...details.data } });
      return old;
    }, transactionOptions);
    await Promise.all(previous.map(deleteStoredImage));
    refreshCatalogue();

    const longEdge = Math.max(image.width, image.height);
    return saved(
      "Photograph saved.",
      longEdge < RECOMMENDED_LONG_EDGE
        ? `This image is ${longEdge}px on its long edge. For the brushwork viewer, ${RECOMMENDED_LONG_EDGE}px or more shows far more detail.`
        : undefined,
    );
  });
}

export async function updateImageDetails(artworkId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const details = imageDetailsSchema.safeParse(formValues(formData));
    if (!details.success) return invalid(details.error);
    const { count } = await db.artworkImage.updateMany({ where: { artworkId, kind: "PRIMARY" }, data: details.data });
    if (count === 0) return failed("Upload a photograph first.");
    refreshCatalogue();
    return saved("Description saved.");
  });
}
