import { expect, test } from "@playwright/test";
import { skipInteractionOnWindowsWebKit } from "./support";

const publicPages = [
  "/",
  "/collection",
  "/collection?exhibition=the-weather-coast&available=1",
  "/collection/moonlight-wood-island-light",
  "/collection/the-veteran-in-a-new-field",
  "/exhibitions",
  "/exhibitions/islands-in-the-sun",
  "/artist",
];

test.describe("a visit to the gallery", () => {
  skipInteractionOnWindowsWebKit();

  test("from the Entrance to a work, through a filtered collection", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Enter the collection" }).click();
    await expect(page).toHaveURL(/\/collection$/);
    await expect(page.getByRole("heading", { level: 1, name: "The Collection" })).toBeVisible();

    const filters = page.getByRole("navigation", { name: "Filter the collection" });
    await expect(filters.locator("summary")).toHaveText([/Exhibition/, /Medium/]);
    await filters.locator("summary", { hasText: "Exhibition" }).click();
    await filters.getByRole("link", { name: "The Weather Coast", exact: true }).click();
    await expect(page).toHaveURL(/\/collection\?exhibition=the-weather-coast$/);
    await expect(page.getByText("Showing 4 works from The Weather Coast.")).toBeVisible();
    await expect(page.getByRole("list", { name: "The Collection" }).getByRole("listitem")).toHaveCount(4);

    await page.getByRole("link", { name: "Cannon Rock", exact: true }).click();
    await expect(page).toHaveURL(/\/collection\/cannon-rock$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Cannon Rock/);
    await expect(page.getByRole("button", { name: "Acquire this work" })).toBeVisible();
  });

  test("the brushwork can be inspected up close, and the view closed with Escape", async ({ page }) => {
    await page.goto("/collection/northeaster");
    const zoom = page.getByRole("dialog", { name: /^Inspect: Northeaster/ });

    await page.getByRole("button", { name: "Inspect the brushwork" }).click();
    await expect(zoom).toBeVisible();
    await expect(zoom.getByRole("img")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(zoom).toBeHidden();
  });

  test("a sold work stays on view, in a private collection, with nothing to acquire", async ({ page }) => {
    await page.goto("/collection/the-veteran-in-a-new-field");
    await expect(page.getByText("In a private collection").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Acquire this work" })).toHaveCount(0);
  });

  test("the gallery's one artist has a page, reached from every work", async ({ page }) => {
    await page.goto("/collection/maine-coast");
    await page.getByRole("link", { name: "About the artist" }).click();
    await expect(page).toHaveURL(/\/artist$/);
    await expect(page.getByRole("heading", { level: 1, name: "Winslow Homer" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Works in the collection" }).getByRole("listitem")).toHaveCount(8);

    // Old links to the artists' directory lead here.
    await page.goto("/artists/edgar-degas");
    await expect(page).toHaveURL(/\/artist$/);
  });

  test("an unknown room is closed, with a way back", async ({ page }) => {
    for (const path of ["/collection/not-a-work", "/no-such-room"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "This room is closed" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Return to the entrance" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("keyboard users can skip straight to the gallery", async ({ page, browserName }) => {
    test.skip(
      browserName === "webkit",
      "WebKit's Tab skips links unless Safari's 'Press Tab to highlight each item' is on, which Playwright cannot set",
    );
    await page.goto("/collection");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to the gallery" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test("on a phone, the menu opens over the room and leads on", async ({ page, isMobile }) => {
    test.skip(!isMobile, "The menu is for small screens");
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Main" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "The Artist" }).click();
    await expect(page).toHaveURL(/\/artist$/);
    await expect(menu).toBeHidden();
  });
});

test.describe("every public page", () => {
  for (const path of publicPages) {
    test(`${path} never scrolls sideways and describes every painting`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.locator("img:not([alt]), img[alt='']")).toHaveCount(0);
    });
  }
});
