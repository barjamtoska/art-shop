"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, withBlankFields, type FormState } from "@/lib/admin-form";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { SLUG_PATTERN, normaliseParagraphs, slugify } from "@/lib/parse";

const artistSchema = z.object({
  name: z.string().trim().min(1, "A name is required.").max(120),
  sortName: z.string().trim().max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .refine((value) => value === "" || SLUG_PATTERN.test(value), "Lowercase letters, numbers and hyphens only."),
  lifeDates: z.string().trim().max(40),
  nationality: z.string().trim().max(60),
  shortBio: z.string().trim().max(300, "Keep it to a sentence or two (300 characters)."),
  biography: z.string().transform(normaliseParagraphs),
  published: z.boolean(),
});

/** "Johannes Vermeer" → "Vermeer, Johannes" when no sort name is given. */
function defaultSortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts.at(-1)}, ${parts.slice(0, -1).join(" ")}` : name.trim();
}

async function parse(formData: FormData, artistId?: string) {
  const values = formValues(formData);
  const parsed = artistSchema.safeParse({
    ...withBlankFields(artistSchema, values),
    published: values.published === "on",
  });
  if (!parsed.success) return { error: invalid(parsed.error) };
  const input = parsed.data;
  const slug = input.slug || slugify(input.name);
  const clash = await db.artist.findFirst({ where: { slug, id: { not: artistId } }, select: { id: true } });
  if (clash)
    return {
      error: failed("Please check the highlighted fields.", { slug: ["Another artist already uses this URL name."] }),
    };
  return { data: { ...input, slug, sortName: input.sortName || defaultSortName(input.name) } };
}

export async function createArtist(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const result = await parse(formData);
    if (result.error) return result.error;
    const artist = await db.artist.create({ data: result.data });
    refreshCatalogue();
    redirect(`/admin/artists/${artist.id}?created=1`);
  });
}

export async function updateArtist(artistId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const result = await parse(formData, artistId);
    if (result.error) return result.error;
    await db.artist.update({ where: { id: artistId }, data: result.data });
    refreshCatalogue();
    return saved();
  });
}

export async function deleteArtist(artistId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const works = await db.artwork.count({ where: { artistId } });
    if (works > 0)
      return failed(
        `This artist has ${works} ${works === 1 ? "work" : "works"} in the collection. Move or delete them first.`,
      );
    await db.artist.delete({ where: { id: artistId } });
    refreshCatalogue();
    redirect("/admin/artists?deleted=1");
  });
}
