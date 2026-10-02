import { expect, test } from "@playwright/test";

/*
 * What browsers and search engines receive besides the pages themselves:
 * security headers, robots.txt, the sitemap, the icon and link previews.
 * Plain HTTP requests, so they run once.
 */

test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "HTTP checks run once, in desktop Chromium",
);

test("every response carries the security headers", async ({ request }) => {
  for (const path of ["/", "/collection/northeaster", "/admin/sign-in", "/robots.txt"]) {
    const response = await request.get(path);
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"], path).toContain("form-action 'self' https://checkout.stripe.com");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("robots.txt keeps private pages out of search and points to the sitemap", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  for (const path of ["/admin", "/api/", "/acquisition/", "/certificate/"]) {
    expect(body).toContain(`Disallow: ${path}`);
  }
  expect(body).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
});

test("the sitemap lists the public rooms and never a private one", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  for (const path of [
    "/collection",
    "/collection/northeaster",
    "/exhibitions/the-weather-coast",
    "/artist",
    "/visit",
  ]) {
    expect(body).toMatch(new RegExp(`<loc>https?://[^<]+${path}</loc>`));
  }
  expect(body).not.toMatch(/\/(admin|acquisition|certificate|api)\b/);
});

test("a work has a description, a canonical address, a link preview and structured data", async ({ page, request }) => {
  await page.goto("/collection/northeaster");
  await expect(page).toHaveTitle(/Northeaster/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/collection\/northeaster$/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{40,}/);

  const preview = await page.locator('meta[property="og:image"]').getAttribute("content");
  const image = await request.get(new URL(preview!).pathname);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(data["@type"]).toBe("VisualArtwork");
  expect(data.offers.priceCurrency).toBe("EUR");
});

test("the gallery has its icon", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="icon"]').first().getAttribute("href");
  const icon = await request.get(href!);
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toContain("image/svg+xml");
});
