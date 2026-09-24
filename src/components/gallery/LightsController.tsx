"use client";

import { useEffect } from "react";

/**
 * Turns the lights on as works come into view.
 *
 * Every lit artwork plays a CSS "lights on" animation on first paint, so
 * works above the fold reveal without waiting for JavaScript. Once hydrated,
 * this marks works that are still off-screen as `data-lit="off"` (unseen), and
 * flips them to `"on"` when they scroll into view. Without JavaScript, or
 * with reduced motion, everything simply stays lit.
 */
export function LightsController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (el.dataset.lit === "off") el.dataset.lit = "on";
            io.unobserve(el);
          } else if (!el.dataset.lit) {
            el.dataset.lit = "off";
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    const observeWithin = (root: ParentNode) => {
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        if (el.dataset.lit !== "on") io.observe(el);
      });
    };

    observeWithin(document);

    // Client-side navigations mount new works without a full page load.
    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("[data-reveal]")) io.observe(node);
          observeWithin(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
