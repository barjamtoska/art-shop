import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/*
 * Automated accessibility checks (axe, WCAG 2.1 A and AA) on every public
 * page, at both sizes. Automated checks find perhaps a third of problems;
 * keyboard and screen-reader walkthroughs cover the rest.
 */

const pages = [
  "/",
  "/collection",
  "/collection?exhibition=the-weather-coast&medium=oil",
  "/collection/moonlight-wood-island-light",
  "/collection/the-veteran-in-a-new-field",
  "/exhibitions",
  "/exhibitions/islands-in-the-sun",
  "/artist",
  "/about",
  "/visit",
  "/shipping-and-returns",
  "/terms",
  "/privacy",
  "/no-such-room",
  "/admin/sign-in",
];

test.skip(({ browserName }) => browserName !== "chromium", "axe runs in Chromium");

for (const path of pages) {
  test(`${path} passes axe (WCAG 2.1 AA)`, async ({ page }) => {
    // Reduced motion: every work fully lit, so colours are measured as seen.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).slice(0, 5).join("\n    ")}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });
}
