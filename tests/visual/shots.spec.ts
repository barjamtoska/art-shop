import { test, type Page } from "@playwright/test";
import { signInAsAdmin } from "../e2e/support";

/**
 * Captures screenshots of key pages into ./screenshots/<project>/ for review
 * against the design system (CLAUDE.md):
 *   <page>-1.png, -2.png …  what a visitor sees, screen by screen
 *   <page>.png              full-page overview (wall stretched to fit)
 * Run with `npm run shots` (optionally `-- --grep lab`).
 * Admin pages sign in first (see tests/e2e/support.ts).
 */
type Shot = { name: string; path: string; admin?: boolean; open?: (page: Page) => Promise<void> };

const pages: Shot[] = [
  { name: "entrance", path: "/" },
  { name: "collection", path: "/collection" },
  { name: "collection-filtered", path: "/collection?exhibition=nocturnes" },
  { name: "artwork", path: "/collection/young-woman-with-a-water-pitcher" },
  { name: "artwork-sold", path: "/collection/madame-x" },
  { name: "exhibitions", path: "/exhibitions" },
  { name: "exhibition", path: "/exhibitions/nocturnes" },
  { name: "artists", path: "/artists" },
  { name: "artist", path: "/artists/edgar-degas" },
  { name: "not-found", path: "/this-room-does-not-exist" },
  { name: "lab", path: "/lab" },
  { name: "admin-sign-in", path: "/admin/sign-in" },
  { name: "admin-overview", path: "/admin", admin: true },
  { name: "admin-artworks", path: "/admin/artworks", admin: true },
  {
    name: "admin-artwork",
    path: "/admin/artworks",
    admin: true,
    open: (page) => page.getByRole("link", { name: "Young Woman with a Water Pitcher" }).click(),
  },
  { name: "admin-artwork-new", path: "/admin/artworks/new", admin: true },
  {
    name: "admin-exhibition",
    path: "/admin/exhibitions",
    admin: true,
    open: (page) => page.getByRole("link", { name: "Nocturnes" }).click(),
  },
  { name: "admin-mediums", path: "/admin/mediums", admin: true },
];

const MAX_SCREENS = 8;

// Screen-by-screen captures of long, layered pages are slow in WebKit at 2x.
test.setTimeout(240_000);

async function loadEverything(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Lazy images load only once on screen, and WebKit paints these pages so
  // slowly at 2x that a quick scroll-through passes them before they start.
  // So bring each rendered painting into view and wait for it, then return to
  // the top. (Lazy images inside display:none never load: skip those.)
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) {
      if (img.complete || !img.checkVisibility()) continue;
      img.scrollIntoView({ block: "center" });
      await new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }
    window.scrollTo(0, 0);
  });
}

for (const { name, path, admin, open } of pages) {
  test(`screenshot ${name}`, async ({ page }, testInfo) => {
    // Reduced motion shows every work fully lit, so shots are deterministic.
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (admin) await signInAsAdmin(page);
    await page.goto(path, { waitUntil: "networkidle" });
    if (open) {
      // Wait for the navigation itself: the network is idle before it starts.
      await Promise.all([page.waitForURL((url) => url.pathname !== path), open(page)]);
      await page.waitForLoadState("networkidle");
    }
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
