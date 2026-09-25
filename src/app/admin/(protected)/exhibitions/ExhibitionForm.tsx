"use client";

import { useId, useState } from "react";
import {
  AdminForm,
  CheckboxField,
  Fieldset,
  GroupErrors,
  TextAreaField,
  TextField,
  quietButtonClass,
} from "@/components/admin/forms";
import type { FormState } from "@/lib/admin-form";

export type ExhibitionFormValues = {
  title: string;
  subtitle: string;
  slug: string;
  statement: string;
  opensOn: string;
  closesOn: string;
  position: string;
  published: boolean;
  workIds: string[];
};

type Work = { id: string; label: string };

export function ExhibitionForm({
  action,
  values,
  works,
  submitLabel = "Save",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: ExhibitionFormValues;
  /** Every work in the collection, to choose from. */
  works: Work[];
  submitLabel?: string;
}) {
  return (
    <AdminForm action={action} submitLabel={submitLabel} className="max-w-3xl">
      <Fieldset legend="The exhibition">
        <TextField name="title" label="Title" defaultValue={values.title} />
        <TextField
          name="subtitle"
          label="Subtitle"
          defaultValue={values.subtitle}
          placeholder="Paintings of the hours after dark"
        />
        <TextField
          name="slug"
          label="URL name"
          defaultValue={values.slug}
          hint="Used in the address, e.g. /exhibitions/nocturnes. Leave empty to make one from the title."
        />
        <div className="grid gap-6 sm:grid-cols-3">
          <TextField name="opensOn" label="Opens" type="date" defaultValue={values.opensOn} />
          <TextField
            name="closesOn"
            label="Closes"
            type="date"
            defaultValue={values.closesOn}
            hint="Leave both empty for an ongoing display."
          />
          <TextField
            name="position"
            label="Order"
            defaultValue={values.position}
            inputMode="numeric"
            hint="Lower numbers come first. The first is “Now showing” in the Entrance."
          />
        </div>
        <TextAreaField
          name="statement"
          label="Curator's statement"
          defaultValue={values.statement}
          rows={8}
          hint="The first paragraph also introduces the exhibition on the Exhibitions page. Leave a blank line between paragraphs."
        />
        <CheckboxField name="published" label="Shown in the gallery" defaultChecked={values.published} />
      </Fieldset>

      <Fieldset
        legend="Works, in hanging order"
        description="Visitors see them in this order. Only works on view appear in the gallery."
      >
        <WorksEditor initial={values.workIds} works={works} />
        <GroupErrors name="workIds" />
      </Fieldset>
    </AdminForm>
  );
}

function WorksEditor({ initial, works }: { initial: string[]; works: Work[] }) {
  const id = useId();
  const [selected, setSelected] = useState(initial.filter((workId) => works.some((w) => w.id === workId)));
  const [toAdd, setToAdd] = useState("");
  const label = (workId: string) => works.find((w) => w.id === workId)?.label ?? "Unknown work";
  const available = works.filter((w) => !selected.includes(w.id));

  const move = (index: number, by: -1 | 1) =>
    setSelected((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });

  return (
    <div className="space-y-5">
      {selected.length === 0 ? (
        <p className="text-sm text-ivory-muted">No works yet.</p>
      ) : (
        <ol className="divide-y divide-gold/10 border border-gold/15">
          {selected.map((workId, index) => (
            <li key={workId} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <input type="hidden" name="workIds" value={workId} />
              <span className="w-6 text-sm text-ivory-muted tabular-nums">{index + 1}.</span>
              <span className="flex-1 text-sm">{label(workId)}</span>
              <span className="flex gap-3">
                <button
                  type="button"
                  className={quietButtonClass}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Up<span className="sr-only">: {label(workId)}</span>
                </button>
                <button
                  type="button"
                  className={quietButtonClass}
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Down<span className="sr-only">: {label(workId)}</span>
                </button>
                <button
                  type="button"
                  className={quietButtonClass}
                  onClick={() => setSelected((list) => list.filter((w) => w !== workId))}
                >
                  Remove<span className="sr-only">: {label(workId)}</span>
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {available.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <label htmlFor={`${id}-add`} className="mb-1.5 block text-sm text-ivory">
              Add a work
            </label>
            <select
              id={`${id}-add`}
              value={toAdd}
              onChange={(event) => setToAdd(event.target.value)}
              className="block w-full border border-gold/30 bg-wall-deep/70 px-3 py-2 text-ivory"
            >
              <option value="">Choose…</option>
              {available.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="border border-gold/60 px-4 py-2 text-sm text-ivory disabled:opacity-50"
            disabled={!toAdd}
            onClick={() => {
              setSelected((list) => [...list, toAdd]);
              setToAdd("");
            }}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
