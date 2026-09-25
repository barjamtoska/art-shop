"use client";

import { AdminForm, CheckboxField, Fieldset, SelectField, TextAreaField, TextField } from "@/components/admin/forms";
import type { FormState } from "@/lib/admin-form";

export type ArtworkFormValues = {
  title: string;
  slug: string;
  artistId: string;
  mediumId: string;
  mediumDescription: string;
  yearLabel: string;
  height: string;
  width: string;
  depth: string;
  price: string;
  frameStyle: "CLASSIC" | "SLIM";
  description: string;
  provenance: string;
  inscription: string;
  framingNote: string;
  metaDescription: string;
  position: string;
  published: boolean;
  featured: boolean;
  exhibitionIds: string[];
};

type Option = { value: string; label: string };

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: ArtworkFormValues;
  artists: Option[];
  mediums: Option[];
  exhibitions: Option[];
  /** False on a new work: it gets its photograph first, then goes on view. */
  canPublish: boolean;
  submitLabel: string;
};

export function ArtworkForm({ action, values, artists, mediums, exhibitions, canPublish, submitLabel }: Props) {
  return (
    <AdminForm action={action} submitLabel={submitLabel}>
      <Fieldset legend="The work">
        <TextField name="title" label="Title" defaultValue={values.title} required />
        <TextField
          name="slug"
          label="URL name"
          defaultValue={values.slug}
          hint="Used in the work's address, e.g. /collection/young-woman-with-a-water-pitcher. Leave empty to make one from the title. Changing it breaks links already shared."
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="artistId"
            label="Artist"
            defaultValue={values.artistId}
            options={artists}
            placeholder="Choose…"
          />
          <TextField name="yearLabel" label="Date" defaultValue={values.yearLabel} placeholder="c. 1662" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="mediumId"
            label="Medium (for the collection filter)"
            defaultValue={values.mediumId}
            options={mediums}
            placeholder="Choose…"
          />
          <TextField
            name="mediumDescription"
            label="Medium, as on the placard"
            defaultValue={values.mediumDescription}
            placeholder="Oil on canvas"
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <TextField name="height" label="Height (cm)" defaultValue={values.height} inputMode="decimal" />
          <TextField name="width" label="Width (cm)" defaultValue={values.width} inputMode="decimal" />
          <TextField name="depth" label="Depth (cm, optional)" defaultValue={values.depth} inputMode="decimal" />
        </div>
      </Fieldset>

      <Fieldset legend="Sale">
        <TextField
          name="price"
          label="Price (EUR)"
          defaultValue={values.price}
          inputMode="decimal"
          hint="Including VAT and worldwide shipping, as shown to collectors."
          className="max-w-xs"
        />
        <p className="text-sm text-ivory-muted">
          Whether a work is available, on hold or sold is set only by checkout and payment, never by hand.
        </p>
      </Fieldset>

      <Fieldset legend="Words">
        <TextAreaField
          name="description"
          label="About the work"
          defaultValue={values.description}
          rows={8}
          hint="Leave a blank line between paragraphs."
        />
        <TextAreaField name="provenance" label="Provenance (optional)" defaultValue={values.provenance} rows={3} />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            name="inscription"
            label="Inscription (optional)"
            defaultValue={values.inscription}
            placeholder="Signed lower right"
          />
          <TextField
            name="framingNote"
            label="Framing (optional)"
            defaultValue={values.framingNote}
            placeholder="Presented framed"
          />
        </div>
        <TextAreaField
          name="metaDescription"
          label="Search description (optional)"
          defaultValue={values.metaDescription}
          rows={2}
          hint="Shown by search engines and link previews. Leave empty to use the first sentence of “About the work”."
        />
      </Fieldset>

      <Fieldset legend="On the wall">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            name="frameStyle"
            label="Frame"
            defaultValue={values.frameStyle}
            options={[
              { value: "CLASSIC", label: "Classic gilded moulding" },
              { value: "SLIM", label: "Slim gilded moulding" },
            ]}
          />
          <TextField
            name="position"
            label="Hanging order"
            defaultValue={values.position}
            inputMode="numeric"
            hint="Lower numbers hang first in the collection."
          />
        </div>
        {exhibitions.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-ivory">Exhibitions</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {exhibitions.map((exhibition) => (
                <CheckboxField
                  key={exhibition.value}
                  name="exhibitionIds"
                  value={exhibition.value}
                  label={exhibition.label}
                  defaultChecked={values.exhibitionIds.includes(exhibition.value)}
                />
              ))}
            </div>
          </div>
        )}
        {canPublish ? (
          <div className="space-y-4">
            <CheckboxField
              name="published"
              label="On view"
              hint="Visible in the collection, its exhibitions and on the artist's page."
              defaultChecked={values.published}
            />
            <CheckboxField
              name="featured"
              label="Hang in the Entrance"
              hint="The single work shown on the home page. Choosing this one takes down the current one."
              defaultChecked={values.featured}
            />
          </div>
        ) : (
          <p className="text-sm text-ivory-muted">
            New works start as drafts. After saving, add the photograph, then put the work on view.
          </p>
        )}
      </Fieldset>
    </AdminForm>
  );
}
