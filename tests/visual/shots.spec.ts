import { test, type Page } from "@playwright/test";

/**
 * Captures screenshots of key pages into ./screenshots/<project>/ for review
 * against the design system (CLAUDE.md):
 *   <page>-1.png, -2.png …  what a visitor sees, screen by screen
 *   <page>.png              full-page overview (wall stretched to fit)
 * Run with `npm run shots` (optionally `-- --grep lab`).
 */
const pages = [
  { name: "home", path: "/" },
  { name: "lab", path: "/lab" },
];

const MAX_SCREENS = 8;

// Screen-by-screen captures of long, layered pages are slow in WebKit at 2x.
test.setTimeout(240_000);

async function loadEverything(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Scroll through so lazy images load, then return to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
}

for (const { name, path } of pages) {
  test(`screenshot ${name}`, async ({ page }, testInfo) => {
    // Reduced motion shows every work fully lit, so shots are deterministic.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path, { waitUntil: "networkidle" });
    await loadEverything(page);

    const dir = `screenshots/${testInfo.project.name}`;
    const { innerHeight, scrollHeight } = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));

    const step = Math.round(innerHeight * 0.85);
    for (let i = 0, y = 0; i < MAX_SCREENS && y < scrollHeight; i++, y += step) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.screenshot({ path: `${dir}/${name}-${i + 1}.png` });
    }

    // Overview: the wall is a fixed, viewport-sized layer, so stretch it over
    // the whole document for this one capture. (Chromium only — WebKit on
    // Windows stalls on full-page captures of long, layered pages.)
    if (testInfo.project.name.includes("webkit")) return;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.addStyleTag({
      content: `.wall { position: absolute !important; height: ${scrollHeight}px !important; }`,
    });
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  });
}
