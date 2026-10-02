"use client";

import { useActionState } from "react";
import type { AcquireState } from "@/app/(gallery)/collection/[slug]/actions";
import { QuietButton } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";

/** The single, quiet action: hold the work and go to checkout. */
export function AcquireForm({ action }: { action: (state: AcquireState) => Promise<AcquireState> }) {
  const [state, dispatch, pending] = useActionState(action, {});
  const a = copy.acquisition;

  return (
    <form action={dispatch} className="flex flex-col items-start gap-3">
      <QuietButton type="submit" disabled={pending} aria-busy={pending}>
        {pending ? a.preparing : copy.actions.acquire}
      </QuietButton>
      {state.refused ? (
        <p role="alert" className="max-w-xs font-display text-lg text-ivory-muted italic">
          {a.refused[state.refused]}
        </p>
      ) : (
        <p className="max-w-xs text-placard text-ivory-muted">{a.holdNote}</p>
      )}
    </form>
  );
}
