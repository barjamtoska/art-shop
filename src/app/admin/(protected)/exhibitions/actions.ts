"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin";
import { catchSaveErrors } from "@/lib/admin-action";
import { failed, formValues, invalid, saved, withBlankFields, type FormState } from "@/lib/admin-form";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { SLUG_PATTERN, normaliseParagraphs, slugify } from "@/lib/parse";

const date = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Use a full date.")
  .transform((value) => (value ? new Date(`${value}T00:00:00Z`) : null));

const exhibitionSchema = z
  .object({
    title: z.string().trim().min(1, "A title is required.").max(120),
    subtitle: z.string().trim().max(200),
    slug: z
      .string()
      .trim()
      .max(80)
      .refine((value) => value === "" || SLUG_PATTERN.test(value), "Lowercase letters, numbers and hyphens only."),
    statement: z.string().transform(normaliseParagraphs),
    opensOn: date,
    closesOn: date,
    position: z.coerce.number().int("A whole number.").min(0).max(1_000_000),
    published: z.boolean(),
    workIds: z.array(z.string()),
  })
  .refine((e) => !e.opensOn || !e.closesOn || e.closesOn >= e.opensOn, {
    path: ["closesOn"],
    message: "The exhibition must close after it opens.",
  });

async function parse(formData: FormData, exhibitionId?: string) {
  const values = formValues(formData);
  const parsed = exhibitionSchema.safeParse({
    ...withBlankFields(exhibitionSchema, values),
    position: values.position || "0",
    published: values.published === "on",
    workIds: [values.workIds ?? []].flat(),
  });
  if (!parsed.success) return { error: invalid(parsed.error) };
  const { workIds, ...input } = parsed.data;
  const slug = input.slug || slugify(input.title);
  const clash = await db.exhibition.findFirst({ where: { slug, id: { not: exhibitionId } }, select: { id: true } });
  if (clash)
    return {
      error: failed("Please check the highlighted fields.", {
        slug: ["Another exhibition already uses this URL name."],
      }),
    };
  const unique = [...new Set(workIds)];
  const found = await db.artwork.count({ where: { id: { in: unique } } });
  if (found !== unique.length)
    return { error: failed("One of the chosen works no longer exists. Reload the page and try again.") };
  return { data: { ...input, slug }, workIds: unique };
}

/** The curator's order: first in the list hangs first. */
const hanging = (workIds: string[]) => workIds.map((artworkId, index) => ({ artworkId, position: (index + 1) * 10 }));

export async function createExhibition(_state: FormState, formData: FormData): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const result = await parse(formData);
    if (result.error) return result.error;
    const exhibition = await db.exhibition.create({
      data: { ...result.data, works: { create: hanging(result.workIds) } },
    });
    refreshCatalogue();
    redirect(`/admin/exhibitions/${exhibition.id}?created=1`);
  });
}

export async function updateExhibition(
  exhibitionId: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    const result = await parse(formData, exhibitionId);
    if (result.error) return result.error;
    await db.$transaction([
      db.exhibition.update({ where: { id: exhibitionId }, data: result.data }),
      db.exhibitionWork.deleteMany({ where: { exhibitionId } }),
      db.exhibitionWork.createMany({ data: hanging(result.workIds).map((w) => ({ ...w, exhibitionId })) }),
    ]);
    refreshCatalogue();
    return saved();
  });
}

export async function deleteExhibition(exhibitionId: string): Promise<FormState> {
  await assertAdmin();
  return catchSaveErrors(async () => {
    // The works themselves stay in the collection.
    await db.exhibition.delete({ where: { id: exhibitionId } });
    refreshCatalogue();
    redirect("/admin/exhibitions?deleted=1");
  });
}
