"use client";

import { createContext, useActionState, useContext, useId, useTransition, type ReactNode } from "react";
import { idle, type FormState } from "@/lib/admin-form";

/*
 * Admin forms: plain, legible controls on the gallery palette. <AdminForm>
 * runs a server action and shows its result; fields read their errors from
 * it. Submitting through a transition (not the form's `action` prop) keeps
 * what was typed when validation fails — React resets action forms.
 */

const FormStateContext = createContext<FormState>(idle);

type AdminFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
};

export function AdminForm({ action, children, submitLabel = "Save", className = "" }: AdminFormProps) {
  const [state, dispatch, pending] = useActionState(action, idle);
  const [, startTransition] = useTransition();

  return (
    <FormStateContext.Provider value={state}>
      <form
        className={`space-y-7 ${className}`}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => dispatch(formData));
        }}
      >
        {children}
        <div className="flex flex-wrap items-center gap-5 border-t border-gold/15 pt-6">
          <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>
    </FormStateContext.Provider>
  );
}

export function SubmitButton({ pending, children }: { pending?: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={pending} className={buttonClass} aria-busy={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center border border-gold/60 px-5 py-2 text-sm tracking-wide text-ivory transition-colors duration-500 hover:border-gold hover:bg-gold/10 disabled:cursor-wait disabled:opacity-60";

export const quietButtonClass =
  "text-sm text-ivory-muted underline decoration-gold/40 underline-offset-4 transition-colors duration-500 hover:text-ivory hover:decoration-gold";

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle") return null;
  return (
    <div role={state.status === "error" ? "alert" : "status"} className="text-sm">
      <p className={state.status === "error" ? "text-alert" : "text-ivory"}>{state.message}</p>
      {state.warning && <p className="mt-1 text-notice">{state.warning}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Fields

const controlClass =
  "block w-full border border-gold/30 bg-wall-deep/70 px-3 py-2 text-[0.9375rem] text-ivory placeholder:text-ivory-muted/60 focus-visible:border-gold focus-visible:outline-1 focus-visible:outline-offset-2 aria-invalid:border-alert";

type FieldProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  className?: string;
};

function useField(name: string) {
  const state = useContext(FormStateContext);
  const id = useId();
  const errors = state.fieldErrors?.[name];
  return { id, errors, describedBy: [`${id}-hint`, errors && `${id}-error`].filter(Boolean).join(" ") };
}

function FieldShell({
  id,
  label,
  hint,
  errors,
  className = "",
  children,
}: FieldProps & { id: string; errors?: string[]; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-ivory">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ivory-muted">
          {hint}
        </p>
      )}
      {errors && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-alert">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

export function TextField({
  name,
  label,
  hint,
  className,
  defaultValue,
  type = "text",
  required,
  inputMode,
  placeholder,
  autoComplete,
}: FieldProps & {
  defaultValue?: string | number | null;
  type?: "text" | "email" | "date" | "url";
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "text" | "email";
  placeholder?: string;
  autoComplete?: string;
}) {
  const { id, errors, describedBy } = useField(name);
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors} className={className} name={name}>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "off"}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        className={controlClass}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  hint,
  className,
  defaultValue,
  rows = 6,
}: FieldProps & { defaultValue?: string | null; rows?: number }) {
  const { id, errors, describedBy } = useField(name);
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors} className={className} name={name}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        className={`${controlClass} leading-relaxed`}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  hint,
  className,
  defaultValue,
  options,
  placeholder,
}: FieldProps & {
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const { id, errors, describedBy } = useField(name);
  return (
    <FieldShell id={id} label={label} hint={hint} errors={errors} className={className} name={name}>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-invalid={errors ? true : undefined}
        aria-describedby={describedBy}
        className={controlClass}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  className = "",
  defaultChecked,
  value,
}: FieldProps & { defaultChecked?: boolean; value?: string }) {
  const { id, errors, describedBy } = useField(name);
  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          value={value}
          defaultChecked={defaultChecked}
          aria-describedby={describedBy}
          className="mt-1 size-4 accent-gold"
        />
        <label htmlFor={id} className="text-sm text-ivory">
          {label}
          {hint && (
            <span id={`${id}-hint`} className="mt-0.5 block text-xs text-ivory-muted">
              {hint}
            </span>
          )}
        </label>
      </div>
      {errors && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-alert">
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

/** Shows errors for a group of controls that has no single input (e.g. a list). */
export function GroupErrors({ name }: { name: string }) {
  const state = useContext(FormStateContext);
  const errors = state.fieldErrors?.[name];
  if (!errors) return null;
  return <p className="mt-2 text-sm text-alert">{errors.join(" ")}</p>;
}

export function Fieldset({
  legend,
  children,
  description,
}: {
  legend: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <fieldset className="space-y-6 border border-gold/15 p-5 sm:p-6">
      <legend className="px-2 font-caps text-label tracking-caps text-ivory-muted">{legend}</legend>
      {description && <p className="-mt-2 text-sm text-ivory-muted">{description}</p>}
      {children}
    </fieldset>
  );
}
