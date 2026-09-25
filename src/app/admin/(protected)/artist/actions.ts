"use server";

import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, withBlankFields, type FormState } from "@/lib/admin-form";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { deleteStoredImage, uploadTarget, verifyUpload, type UploadTarget } from "@/lib/image-upload";
import { normaliseParagraphs, slugify } from "@/lib/parse";

/*
 * The gallery's one artist. There is never a second profile (the database
 * refuses one): saving creates it the first time and updates it after.
 */

const artistSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  sortName: z.string().trim().max(120),
  lifeDates: z.string().trim().max(40),
  nationality: z.string().trim().max(60),
  shortBio: z.string().trim().max(300, "Keep it to a sentence or two (300 characters)."),
  biography: z.string().transform(normaliseParagraphs),
  statement: z.string().transform(normaliseParagraphs),
});

/** "Winslow Homer" → "Homer, Winslow" when no sort name is given. */
function defaultSortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts.at(-1)}, ${parts.slice(0, -1).join(" ")}` : name.trim();
}

export async function saveArtist(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const parsed = artistSchema.safeParse(withBlankFields(artistSchema, formValues(formData)));
    if (!parsed.success) return invalid(parsed.error);
    const input = parsed.data;
    const data = {
      ...input,
      slug: slugify(input.name) || "artist",
      sortName: input.sortName || defaultSortName(input.name),
    };

    const existing = await db.artist.findFirst({ select: { id: true } });
    if (existing) await db.artist.update({ where: { id: existing.id }, data });
    else await db.artist.create({ data });
    refreshCatalogue();
    return saved(existing ? "Saved." : "Profile created. You can now add works.");
  });
}

// ---------------------------------------------------------------- Portrait

export async function prepareArtistUpload(): Promise<UploadTarget> {
  await assertAdmin();
  return uploadTarget("artist");
}

const portraitSchema = z.object({
  alt: z
    .string()
    .trim()
    .min(10, "Describe the portrait for someone who cannot see it.")
    .max(400, "Keep it under 400 characters."),
});

export async function attachPortrait(upload: { key: string; alt: string }): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const details = portraitSchema.safeParse(upload);
    if (!details.success) return invalid(details.error);
    const artist = await db.artist.findFirst();
    if (!artist) return failed("Save the artist’s profile first.");

    let image;
    try {
      image = await verifyUpload("artist", upload.key);
    } catch (error) {
      return failed(error instanceof Error ? error.message : "The upload could not be verified.");
    }
    await db.artist.update({
      where: { id: artist.id },
      data: {
        portraitStorage: image.storage,
        portraitKey: image.key,
        portraitWidth: image.width,
        portraitHeight: image.height,
        portraitAlt: details.data.alt,
      },
    });
    if (artist.portraitStorage && artist.portraitKey) {
      await deleteStoredImage({ storage: artist.portraitStorage, key: artist.portraitKey });
    }
    refreshCatalogue();
    return saved("Portrait saved.");
  });
}

export async function removePortrait(): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const artist = await db.artist.findFirst();
    if (!artist?.portraitStorage || !artist.portraitKey) return failed("There is no portrait to remove.");
    await db.artist.update({
      where: { id: artist.id },
      data: {
        portraitStorage: null,
        portraitKey: null,
        portraitWidth: null,
        portraitHeight: null,
        portraitAlt: null,
      },
    });
    await deleteStoredImage({ storage: artist.portraitStorage, key: artist.portraitKey });
    refreshCatalogue();
    return saved("Portrait removed.");
  });
}

// ---------------------------------------------------------------- Demonstration works

/**
 * Removes the demonstration works (public-domain paintings by another
 * painter), so the owner's own name never stands above them. Works with
 * orders are kept, as are exhibitions (now possibly empty, for reuse).
 */
export async function removeDemoWorks(): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const works = await db.artwork.findMany({
      where: { isDemo: true, orders: { none: {} } },
      select: { id: true, images: { select: { storage: true, key: true } } },
    });
    await db.artwork.deleteMany({ where: { id: { in: works.map((w) => w.id) } } });
    await Promise.all(works.flatMap((w) => w.images).map(deleteStoredImage));
    refreshCatalogue();
    return saved(
      `${works.length} demonstration ${works.length === 1 ? "work" : "works"} removed. The collection now holds only your own.`,
    );
  });
}
