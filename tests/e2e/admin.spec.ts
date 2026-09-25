import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { config } from "dotenv";
import { Client } from "pg";
import { ADMIN_EMAIL, mailSince, signInAsAdmin, signInLink } from "./support";

/*
 * The admin, through the browser, against the development database. Every
 * test puts back what it changes. Needs ADMIN_EMAILS to include
 * admin@example.com (or E2E_ADMIN_EMAIL) and no RESEND_API_KEY, so sign-in
 * links land in .dev-mail.
 */

// Admin tests share one database and one admin mailbox: they run one at a
// time, in one browser project (desktop Chromium). Screenshots cover phones.
test.describe.configure({ mode: "serial" });
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "Admin flows run once, in desktop Chromium",
);

const TEST_TITLE_PREFIX = "Test Nocturne";

// Remove works these tests created (and their uploads), even after a failed run.
async function removeTestWorks() {
  config({ path: ".env.local", quiet: true });
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ id: string }>(`select id from "Artwork" where title like $1`, [
      `${TEST_TITLE_PREFIX} %`,
    ]);
    for (const { id } of rows) {
      await client.query(`delete from "Artwork" where id = $1`, [id]);
      await rm(path.join(process.cwd(), "public/uploads/artworks", id), { recursive: true, force: true });
    }
  } finally {
    await client.end();
  }
}
test.beforeAll(removeTestWorks);
test.afterAll(removeTestWorks);

test.describe("signing in", () => {
  test("the admin area is closed without a session", async ({ page }) => {
    await page.goto("/admin/artworks");
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("an administrator signs in with an emailed link, once", async ({ page, context }) => {
    const since = new Date();
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email address").fill(ADMIN_EMAIL);
    await page.getByRole("button", { name: "Send me a sign-in link" }).click();
    await expect(page.getByText("a sign-in link is on its way")).toBeVisible();

    const link = await signInLink(since);
    await page.goto(link);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();

    // The same link cannot be used again.
    await context.clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL(/\/admin\/sign-in\?error=INVALID_TOKEN$/);
    await expect(page.getByText("That sign-in link is not valid, or has already been used.")).toBeVisible();
  });

  test("anyone else gets the same answer, and no email", async ({ page }) => {
    const since = new Date();
    const stranger = `stranger-${Date.now()}@example.com`;
    await page.goto("/admin/sign-in");
    await page.getByLabel("Email address").fill(stranger);
    await page.getByRole("button", { name: "Send me a sign-in link" }).click();
    await expect(page.getByText("a sign-in link is on its way")).toBeVisible();
    await page.waitForTimeout(1500);
    expect(await mailSince(since, stranger)).toHaveLength(0);
  });

  test("signing out closes the admin area", async ({ page }) => {
    await signInAsAdmin(page);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in$/);
  });
});

test.describe("the collection", () => {
  // Several page loads each, against the development server.
  test.setTimeout(60_000);
  test.beforeEach(async ({ page }) => signInAsAdmin(page));

  test("an edit appears in the gallery straight away", async ({ page }) => {
    await page.goto("/admin/artworks");
    await page.getByRole("link", { name: "Snap the Whip" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Snap the Whip" })).toBeVisible();
    const editUrl = page.url();
    const title = page.getByLabel("Title");
    await title.fill("Snap the Whip (retitled)");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved. The work is on view.")).toBeVisible();

    await page.goto("/collection/snap-the-whip");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Snap the Whip \(retitled\)/);

    // Put it back, and check the gallery shows the original again.
    await page.goto(editUrl);
    await page.getByLabel("Title").fill("Snap the Whip");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved. The work is on view.")).toBeVisible();
    await page.goto("/collection/snap-the-whip");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snap the Whip, Winslow Homer");
  });

  test("the artist's words appear on The Artist page", async ({ page }) => {
    await page.goto("/admin/artist");
    const statement = page.getByLabel("In the artist’s words (optional)");
    const original = await statement.inputValue();
    await statement.fill("I paint the sea, because it never keeps still.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();

    await page.goto("/artist");
    await expect(page.getByRole("heading", { name: "In the artist’s words" })).toBeVisible();
    await expect(page.getByText("I paint the sea, because it never keeps still.")).toBeVisible();

    // Put it back.
    await page.goto("/admin/artist");
    await page.getByLabel("In the artist’s words (optional)").fill(original);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  });

  test("a new work goes from draft, to photographed, to on view, to deleted", async ({ page }) => {
    const title = `${TEST_TITLE_PREFIX} ${Date.now()}`;
    await page.goto("/admin/artworks/new");
    await page.getByLabel("Title").fill(title);
    await expect(page.getByLabel("Artist")).toHaveCount(0); // one artist: nothing to choose
    await page.getByLabel("Date").fill("2026");
    await page.getByLabel("Medium (for the collection filter)").selectOption({ label: "Oil" });
    await page.getByLabel("Medium, as on the placard").fill("Oil on canvas");
    await page.getByLabel("Height (cm)").fill("40");
    await page.getByLabel("Width (cm)").fill("50,5");
    await page.getByLabel("Price (EUR)").fill("12,500");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByText("Saved as a draft. Now add the photograph")).toBeVisible();

    // Not on view yet.
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    expect((await page.request.get(`/collection/${slug}`)).status()).toBe(404);

    // Putting it on view without a photograph is refused.
    await page.getByLabel("On view").check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Add an image before putting the work on view.")).toBeVisible();

    // Add the photograph (a description is required).
    await page.locator("input[type=file]").setInputFiles(path.join(process.cwd(), "public/seed/sloop-nassau.jpg"));
    await page
      .getByLabel("Description for screen readers")
      .last()
      .fill("A white sloop with billowing sails rides out a squall on turquoise water.");
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("Photograph saved.")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/below the recommended 3000px/).first()).toBeVisible();

    // Now it can go on view, and appears in the gallery.
    await page.getByLabel("On view").check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved. The work is on view.")).toBeVisible();
    await page.goto(`/collection/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(new RegExp(title));
    await expect(page.getByText("€12,500").first()).toBeVisible();
    await expect(page.getByText(/40 × 50\.5 cm/).first()).toBeVisible();

    // Delete it again.
    await page.goBack();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete this work" }).click();
    await expect(page).toHaveURL(/\/admin\/artworks\?deleted=1$/);
    expect((await page.request.get(`/collection/${slug}`)).status()).toBe(404);
  });

  test("a sold work cannot be deleted, and its sale cannot be changed by hand", async ({ page }) => {
    await page.goto("/admin/artworks");
    await page.getByRole("link", { name: "The Veteran in a New Field" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "The Veteran in a New Field" })).toBeVisible();
    await expect(page.getByText("Sold", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete this work" })).toHaveCount(0);
    await expect(page.getByText("set only by checkout and payment, never by hand")).toBeVisible();
    await expect(page.getByLabel(/status/i)).toHaveCount(0);
  });
});
