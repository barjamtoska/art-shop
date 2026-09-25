import type { z } from "zod";

/*
 * The result every admin form action returns, rendered by <AdminForm>.
 * Shared by server actions and client forms, so it has no server-only code.
 */

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Advice that does not block saving (e.g. an image too small for zoom). */
  warning?: string;
  fieldErrors?: Record<string, string[]>;
};

export const idle: FormState = { status: "idle" };

export function invalid(error: z.ZodError, message = "Please check the highlighted fields."): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { status: "error", message, fieldErrors };
}

export function failed(message: string, fieldErrors?: Record<string, string[]>): FormState {
  return { status: "error", message, fieldErrors };
}

export function saved(message = "Saved.", warning?: string): FormState {
  return { status: "success", message, warning };
}

/** FormData to a plain object of strings (checkboxes → "on"; repeated names → arrays). */
export function formValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    const existing = values[key];
    values[key] = existing === undefined ? value : [...(Array.isArray(existing) ? existing : [existing]), value];
  }
  return values;
}

/**
 * Treats a field missing from the submission as empty, so optional text
 * fields never fail as "expected string" (e.g. when a form omits them).
 */
export function withBlankFields(schema: z.ZodObject, values: Record<string, unknown>): Record<string, unknown> {
  const blanks = Object.fromEntries(Object.keys(schema.shape).map((key) => [key, ""]));
  return { ...blanks, ...values };
}
