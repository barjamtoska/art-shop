import { test } from "@playwright/test";

/**
 * Playwright's WebKit on Windows paints in software: a single frame of these
 * layered pages can take seconds, so tests that click or scroll time out.
 * Call inside a describe block or test to skip them there; they still run in
 * WebKit on Linux (CI), and in Chromium everywhere.
 */
export function skipInteractionOnWindowsWebKit() {
  test.skip(
    ({ browserName }) => browserName === "webkit" && process.platform === "win32",
    "Playwright's WebKit on Windows paints too slowly for interaction tests; they run in WebKit on Linux (CI)",
  );
}
