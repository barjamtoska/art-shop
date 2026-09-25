"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for the filter menus (plain <details>): close them
 * on Escape or a click elsewhere. Without JavaScript they still work.
 */
export function FilterMenusAutoClose() {
  useEffect(() => {
    const openMenus = () => document.querySelectorAll<HTMLDetailsElement>("details[data-filter-menu][open]");

    const onPointerDown = (e: PointerEvent) => {
      openMenus().forEach((menu) => {
        if (!menu.contains(e.target as Node)) menu.open = false;
      });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      openMenus().forEach((menu) => {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      });
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
