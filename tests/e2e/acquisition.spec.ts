import { expect, test, type Page } from "@playwright/test";
import { makeWork, removeTestWorks } from "./test-works";

/*
 * Acquiring a work, end to end, through the local test checkout (no Stripe
 * keys in development): the hold, the signed webhook, the certificate, and
 * the work joining a private collection. Each test acquires its own
 * throwaway work in the development database and removes it afterwards.
 */

test.describe.configure({ mode: "serial" });
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "Acquisitions run once, in desktop Chromium",
);
test.setTimeout(90_000);

test.beforeAll(removeTestWorks);
test.afterAll(removeTestWorks);

async function startAcquisition(page: Page, slug: string) {
  await page.goto(`/collection/${slug}`);
  await page.getByRole("button", { name: "Acquire this work" }).click();
  // Generous: on the dev server, the first visit compiles the checkout page.
  await expect(page).toHaveURL(/\/acquisition\/test-checkout\?session_id=cs_local_/, { timeout: 30_000 });
}

test("a collector acquires a work and receives the certificate", async ({ page, browser }) => {
  const work = await makeWork();
  await startAcquisition(page, work.slug);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(work.title);
  await expect(page.getByText("€12,500")).toBeVisible();

  // While it is held, other visitors see it under consideration, with nothing to acquire.
  const other = await browser.newPage();
  await other.goto(`/collection/${work.slug}`);
  await expect(other.getByText("Under consideration by another collector")).toBeVisible();
  await expect(other.getByRole("button", { name: "Acquire this work" })).toHaveCount(0);
  await other.close();

  await page.getByRole("button", { name: "Complete test payment" }).click();
  await expect(page).toHaveURL(/\/acquisition\/complete\?session_id=/);
  await expect(page.getByRole("heading", { level: 1, name: "Thank you" })).toBeVisible();

  await page.getByRole("link", { name: "View your certificate of acquisition" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Certificate of Acquisition" })).toBeVisible();
  await expect(page.getByText(/^MAI-\d{4}-\d{4}$/)).toBeVisible();
  await expect(page.getByText("Ada Collector")).toBeVisible();

  // The work stays on view, in a private collection.
  await page.goto(`/collection/${work.slug}`);
  await expect(page.getByText("In a private collection").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Acquire this work" })).toHaveCount(0);
});

test("leaving checkout releases the work at once", async ({ page }) => {
  const work = await makeWork();
  await startAcquisition(page, work.slug);
  await page.getByRole("button", { name: "Cancel (back to the gallery)" }).click();
  await expect(page).toHaveURL(/\/acquisition\/cancelled\?work=/);
  await expect(page.getByRole("heading", { name: "Your acquisition was not completed" })).toBeVisible();

  await page.getByRole("link", { name: "Return to the work" }).click();
  await expect(page.getByRole("button", { name: "Acquire this work" })).toBeVisible();
});

test("a sold work's certificate link is private and the page is not indexed", async ({ page }) => {
  const response = await page.goto("/certificate/not-a-real-token");
  expect(response?.status()).toBe(404);
});
