"use client";

import { useState, useTransition } from "react";
import { FormMessage, buttonClass } from "@/components/admin/forms";
import { idle, type FormState } from "@/lib/admin-form";

/** A one-click admin action (optionally confirmed), showing its result. */
export function ActionButton({
  action,
  label,
  confirmation,
}: {
  action: () => Promise<FormState>;
  label: string;
  confirmation?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(idle);

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        className={buttonClass}
        onClick={() => {
          if (confirmation && !window.confirm(confirmation)) return;
          startTransition(async () => setState(await action()));
        }}
      >
        {pending ? "Working…" : label}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
