"use server";

import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, type FormState } from "@/lib/admin-form";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { slugify } from "@/lib/parse";

/** Mediums are the collection filter ("Oil", "Pastel"); the placard wording lives on each work. */
const mediumSchema = z.object({ name: z.string().trim().min(1, "A name is required.").max(60) });

async function checkName(name: string, mediumId?: string): Promise<FormState | null> {
  const slug = slugify(name);
  if (!slug) return failed("Please check the name.", { name: ["Use letters or numbers."] });
  const clash = await db.medium.findFirst({ where: { slug, id: { not: mediumId } }, select: { id: true } });
  return clash ? failed("Please check the name.", { name: ["That medium already exists."] }) : null;
}

export async function createMedium(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const parsed = mediumSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalid(parsed.error);
    const problem = await checkName(parsed.data.name);
    if (problem) return problem;
    await db.medium.create({ data: { name: parsed.data.name, slug: slugify(parsed.data.name) } });
    refreshCatalogue();
    return saved(`Added “${parsed.data.name}”.`);
  });
}

export async function updateMedium(mediumId: string, _state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const parsed = mediumSchema.safeParse(formValues(formData));
    if (!parsed.success) return invalid(parsed.error);
    const problem = await checkName(parsed.data.name, mediumId);
    if (problem) return problem;
    // The slug stays: it appears in filter links visitors may have saved.
    await db.medium.update({ where: { id: mediumId }, data: { name: parsed.data.name } });
    refreshCatalogue();
    return saved("Renamed.");
  });
}

export async function deleteMedium(mediumId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const works = await db.artwork.count({ where: { mediumId } });
    if (works > 0) return failed(`${works} ${works === 1 ? "work uses" : "works use"} this medium. Change them first.`);
    await db.medium.delete({ where: { id: mediumId } });
    refreshCatalogue();
    return saved("Deleted.");
  });
}
