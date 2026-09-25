"use client";

import { AdminForm, CheckboxField, TextAreaField, TextField } from "@/components/admin/forms";
import type { FormState } from "@/lib/admin-form";

export type ArtistFormValues = {
  name: string;
  sortName: string;
  slug: string;
  lifeDates: string;
  nationality: string;
  shortBio: string;
  biography: string;
  published: boolean;
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
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={values.name} />
        <TextField
          name="sortName"
          label="Sorted as"
          defaultValue={values.sortName}
          placeholder="Vermeer, Johannes"
          hint="For alphabetical order. Leave empty to use “Surname, First names”."
        />
      </div>
      <TextField
        name="slug"
        label="URL name"
        defaultValue={values.slug}
        hint="Used in the address, e.g. /artists/johannes-vermeer. Leave empty to make one from the name."
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="nationality" label="Nationality" defaultValue={values.nationality} placeholder="Dutch" />
        <TextField name="lifeDates" label="Life dates" defaultValue={values.lifeDates} placeholder="1632–1675" />
      </div>
      <TextAreaField
        name="shortBio"
        label="In one sentence"
        defaultValue={values.shortBio}
        rows={2}
        hint="Shown in the artists' directory and beside each of their works."
      />
      <TextAreaField
        name="biography"
        label="Biography"
        defaultValue={values.biography}
        rows={10}
        hint="Leave a blank line between paragraphs."
      />
      <CheckboxField
        name="published"
        label="Shown in the gallery"
        hint="When hidden, the artist's page and all their works are off view."
        defaultChecked={values.published}
      />
    </AdminForm>
  );
}
