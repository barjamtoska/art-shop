import { expect, test } from "@playwright/test";
import { makeWork, removeWorks } from "../e2e/test-works";

/**
 * Screenshots of the acquisition pages, which exist only after a real
 * acquisition: the work with its Acquire button, the local test checkout,
 * the confirmation and the certificate. Uses a throwaway work.
 */
test.skip(({ browserName }) => browserName !== "chromium", "Acquisition screens are captured in Chromium");
test.setTimeout(120_000);

const made: string[] = [];
test.afterAll(() => removeWorks(made));

test("screenshot acquisition", async ({ page }, testInfo) => {
  const dir = `screenshots/${testInfo.project.name}`;
  await page.emulateMedia({ reducedMotion: "reduce" });
  const work = await makeWork();
  made.push(work.slug);

  await page.goto(`/collection/${work.slug}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${dir}/acquisition-1-work.png` });

  await page.getByRole("button", { name: "Acquire this work" }).click();
  await expect(page).toHaveURL(/test-checkout/, { timeout: 30_000 });
  await page.screenshot({ path: `${dir}/acquisition-2-checkout.png`, fullPage: true });

  await page.getByRole("button", { name: "Complete test payment" }).click();
  await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/acquisition-3-complete.png` });

  await page.getByRole("link", { name: "View your certificate of acquisition" }).click();
  await expect(page.getByRole("heading", { name: "Certificate of Acquisition" })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${dir}/acquisition-4-certificate.png`, fullPage: true });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: `${dir}/acquisition-5-certificate-print.png`, fullPage: true });
});
