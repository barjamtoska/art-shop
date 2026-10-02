"use client";

import { QuietButton } from "@/components/ui/Quiet";

export function PrintButton({ label }: { label: string }) {
  return (
    <QuietButton type="button" onClick={() => window.print()}>
      {label}
    </QuietButton>
  );
}
