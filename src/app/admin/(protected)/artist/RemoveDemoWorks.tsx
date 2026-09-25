"use client";

import { useState, useTransition } from "react";
import { FormMessage } from "@/components/admin/forms";
import { idle, type FormState } from "@/lib/admin-form";

/** Removes the demonstration works after an explicit confirmation. */
export function RemoveDemoWorks({ action, count }: { action: () => Promise<FormState>; count: number }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<FormState>(idle);

  return (
    <div className="flex flex-wrap items-center gap-5">
      <button
        type="button"
        disabled={pending}
        className="border border-notice/60 px-4 py-2 text-sm text-ivory transition-colors duration-500 hover:border-notice hover:bg-notice/10 disabled:opacity-60"
        onClick={() => {
          if (!window.confirm(`Remove the ${count} demonstration works from the collection? This cannot be undone.`))
            return;
          startTransition(async () => setState(await action()));
        }}
      >
        {pending ? "Removing…" : "Remove the demonstration works"}
      </button>
      <FormMessage state={state} />
    </div>
  );
}
