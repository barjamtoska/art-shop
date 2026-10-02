import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

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

/**
 * Waits until the page is as a visitor sees it: loaded, fonts in, every
 * painting on screen decoded. (Not "network idle": a production build keeps
 * prefetching linked rooms, so the network may never fall quiet.)
 */
export async function settled(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const onScreen = Array.from(document.images).filter((img) => img.checkVisibility() && img.loading !== "lazy");
    await Promise.all(onScreen.map((img) => img.decode().catch(() => undefined)));
  });
}

/** The admin address the tests sign in with; must be in ADMIN_EMAILS. */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";

const OUTBOX = path.join(process.cwd(), ".dev-mail");

type Mail = { to: string; subject: string; text: string; sentAt: string };

/** Emails the dev server wrote to .dev-mail (no Resend key) since `since`. */
export async function mailSince(since: Date, to: string): Promise<Mail[]> {
  const files = await readdir(OUTBOX).catch(() => [] as string[]);
  const mails = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => JSON.parse(await readFile(path.join(OUTBOX, f), "utf8")) as Mail),
  );
  // Newest first.
  return mails
    .filter((m) => m.to === to && new Date(m.sentAt) >= since)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

/**
 * Waits for the newest sign-in email sent to `to` after `since` (and, if
 * given, whose link contains `marker`), and returns its link.
 */
export async function signInLink(since: Date, { to = ADMIN_EMAIL, marker = "" } = {}): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const links = (await mailSince(since, to)).map(
          (mail) => mail.text.match(/https?:\/\/\S+magic-link\/verify\S+/)?.[0] ?? "",
        );
        link = links.find((l) => l && l.includes(marker)) ?? "";
        return link;
      },
      { message: `a sign-in email to ${to} in .dev-mail`, timeout: 20_000 },
    )
    .not.toBe("");
  return link;
}

/**
 * Signs in as the admin through the real magic-link flow (link read from the
 * dev outbox). Each request carries its own marker in the callback URL, so
 * tests running at the same time never take each other's link.
 */
export async function signInAsAdmin(page: Page) {
  const since = new Date();
  const marker = randomUUID();
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const response = await page.request.post("/api/auth/sign-in/magic-link", {
    data: { email: ADMIN_EMAIL, callbackURL: `/admin?signin=${marker}` },
    headers: { Origin: origin },
  });
  expect(response.ok()).toBe(true);
  await page.goto(await signInLink(since, { marker }));
  await expect(page).toHaveURL(/\/admin\?signin=/);
}
