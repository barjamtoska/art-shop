"use client";

import { useState, useTransition } from "react";
import type { FormState } from "@/lib/admin-form";

/** Deletes after an explicit confirmation; shows why if the server refuses. */
export function DeleteButton({
  action,
  label,
  confirmation,
}: {
  action: () => Promise<FormState | void>;
  label: string;
  confirmation: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="border border-alert/50 px-4 py-2 text-sm text-alert transition-colors duration-500 hover:border-alert hover:bg-alert/10 disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(confirmation)) return;
          startTransition(async () => {
            const result = await action();
            if (result && result.status === "error") setError(result.message ?? "Could not delete.");
          });
        }}
      >
        {pending ? "Deleting…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
