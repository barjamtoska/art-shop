"use client";

import { useRef } from "react";
import { copy } from "@/config/copy";
import { site } from "@/config/site";
import { NavLinks } from "./NavLinks";

/**
 * A quiet, full-screen menu for small screens. A native modal <dialog> gives
 * focus trapping, Escape to close and focus return to the trigger for free.
 */
export function MobileMenu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        className="font-caps text-label tracking-caps text-ivory md:hidden"
      >
        {copy.menu.open}
      </button>
      <dialog ref={dialog} className="menu-dialog" aria-label={copy.menu.label}>
        <div className="flex h-full flex-col px-4 py-6">
          <div className="flex items-center justify-between">
            <span className="font-caps text-xl tracking-display">{site.name}</span>
            <button type="button" onClick={close} className="font-caps text-label tracking-caps text-ivory">
              {copy.menu.close}
            </button>
          </div>
          <nav aria-label={copy.menu.label} className="flex flex-1 items-center justify-center pb-16">
            <NavLinks variant="menu" onNavigate={close} />
          </nav>
        </div>
      </dialog>
    </>
  );
}
