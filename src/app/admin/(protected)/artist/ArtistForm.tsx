"use client";

import { AdminForm, TextAreaField, TextField } from "@/components/admin/forms";
import type { FormState } from "@/lib/admin-form";

export type ArtistFormValues = {
  name: string;
  lifeDates: string;
  nationality: string;
  shortBio: string;
  biography: string;
  statement: string;
};

export function ArtistForm({
  action,
  values,
  submitLabel = "Save",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: ArtistFormValues;
  submitLabel?: string;
}) {
  return (
    <AdminForm action={action} submitLabel={submitLabel} className="max-w-3xl">
      <TextField name="name" label="Name" defaultValue={values.name} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          name="nationality"
          label="Nationality (optional)"
          defaultValue={values.nationality}
          placeholder="Irish"
        />
        <TextField name="lifeDates" label="Dates (optional)" defaultValue={values.lifeDates} placeholder="born 1975" />
      </div>
      <TextAreaField
        name="shortBio"
        label="In one sentence"
        defaultValue={values.shortBio}
        rows={2}
        hint="Shown beside each work, under “The artist”, and in search results."
      />
      <TextAreaField
        name="biography"
        label="Biography"
        defaultValue={values.biography}
        rows={10}
        hint="Shown on The Artist page. Leave a blank line between paragraphs."
      />
      <TextAreaField
        name="statement"
        label="In the artist’s words (optional)"
        defaultValue={values.statement}
        rows={6}
        hint="A statement in the first person, shown as a quotation on The Artist page. Leave it empty to leave it out."
      />
    </AdminForm>
  );
}
