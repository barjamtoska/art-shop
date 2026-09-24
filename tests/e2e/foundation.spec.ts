import { expect, test } from "@playwright/test";

test.describe("design foundation", () => {
  test("never scrolls sideways (spotlights are clipped at the page edge)", async ({ page }) => {
    await page.goto("/lab");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("works below the fold light up as they come into view", async ({ page }) => {
    await page.goto("/lab", { waitUntil: "networkidle" });
    const last = page.locator("[data-reveal]").last();

    // Off-screen works are switched off once the page is interactive (generous
    // timeout: against a cold dev server, hydration waits on compilation)…
    await expect(last).toHaveAttribute("data-lit", "off", { timeout: 20_000 });
    // …and switched on when the visitor reaches them.
    await last.scrollIntoViewIfNeeded();
    await expect(last).toHaveAttribute("data-lit", "on");
  });

  test("with reduced motion, every work is simply lit", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-lit]")).toHaveCount(0);
  });

  test("every painting has alt text", async ({ page }) => {
    await page.goto("/lab");
    const missing = await page.locator("img:not([alt]), img[alt='']").count();
    expect(missing).toBe(0);
  });
});
