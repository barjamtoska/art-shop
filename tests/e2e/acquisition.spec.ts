import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { latestOrder, makeWork, removeTestWorks } from "./test-works";

/*
 * Acquiring a work, end to end: the hold, the signed webhook, the certificate,
 * and the work joining a private collection. Each test acquires its own
 * throwaway work and removes it afterwards.
 *
 * Two ways to pay, depending on how the server runs:
 * - Development, no Stripe keys: the site's local test checkout.
 * - E2E_STRIPE=1 (CI): the server's real Stripe client talks to stripe-mock.
 *   This test stands in for Stripe's hosted page and for Stripe itself,
 *   sending the signed checkout.session.* events Stripe would send.
 */

const viaStripe = process.env.E2E_STRIPE === "1";

test.describe.configure({ mode: "serial" });
test.skip(
  ({ browserName, isMobile }) => browserName !== "chromium" || isMobile,
  "Acquisitions run once, in desktop Chromium",
);
test.setTimeout(90_000);

test.beforeAll(removeTestWorks);
test.afterAll(removeTestWorks);

async function startAcquisition(page: Page, slug: string) {
  if (viaStripe) {
    // Stripe's hosted page is out of reach in tests; stand in for it.
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>Stripe Checkout</title><h1>Stripe Checkout</h1>" }),
    );
  }
  await page.goto(`/collection/${slug}`);
  await page.getByRole("button", { name: "Acquire this work" }).click();
  // Generous: on the dev server, the first visit compiles the checkout page.
  await expect(page).toHaveURL(
    viaStripe ? /^https:\/\/checkout\.stripe\.com\// : /\/acquisition\/test-checkout\?session_id=cs_local_/,
    { timeout: 30_000 },
  );
}

/** What Stripe sends when a checkout ends: a signed event, to the webhook. */
async function stripeSends(request: APIRequestContext, type: "completed" | "expired", slug: string) {
  const order = await latestOrder(slug);
  const paid = type === "completed";
  const payload = JSON.stringify({
    id: `evt_${randomUUID().replace(/-/g, "")}`,
    object: "event",
    type: `checkout.session.${type}`,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: order.stripeSessionId,
        object: "checkout.session",
        status: paid ? "complete" : "expired",
        payment_status: paid ? "paid" : "unpaid",
        amount_total: order.amountCents,
        currency: order.currency,
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        payment_intent: paid ? `pi_${randomUUID().replace(/-/g, "")}` : null,
        customer_details: paid ? { name: "Ada Collector", email: "ada@example.com", phone: null, address: null } : null,
        collected_information: paid
          ? {
              shipping_details: {
                name: "Ada Collector",
                address: {
                  line1: "1 Harbour Road",
                  line2: null,
                  postal_code: "D01",
                  city: "Dublin",
                  state: null,
                  country: "IE",
                },
              },
            }
          : null,
      },
    },
  });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("E2E_STRIPE=1 needs STRIPE_WEBHOOK_SECRET (the server's)");
  const signature = new Stripe("sk_test_signing_only").webhooks.generateTestHeaderString({ payload, secret });
  const response = await request.post("/api/webhooks/stripe", {
    headers: { "content-type": "application/json", "stripe-signature": signature },
    data: payload,
  });
  expect(response.status()).toBe(200);
  return order;
}

test("a collector acquires a work and receives the certificate", async ({ page, browser, request }) => {
  const work = await makeWork();
  await startAcquisition(page, work.slug);
  if (!viaStripe) {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(work.title);
    await expect(page.getByText("€12,500")).toBeVisible();
  }

  // While it is held, other visitors see it under consideration, with nothing to acquire.
  const other = await browser.newPage();
  await other.goto(`/collection/${work.slug}`);
  await expect(other.getByText("Under consideration by another collector")).toBeVisible();
  await expect(other.getByRole("button", { name: "Acquire this work" })).toHaveCount(0);
  await other.close();

  if (viaStripe) {
    const order = await stripeSends(request, "completed", work.slug);
    // Stripe then returns the collector to the gallery.
    await page.goto(`/acquisition/complete?session_id=${order.stripeSessionId}`);
  } else {
    await page.getByRole("button", { name: "Complete test payment" }).click();
  }
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

test("a checkout that ends unpaid releases the work", async ({ page, request }) => {
  const work = await makeWork();
  await startAcquisition(page, work.slug);
  if (viaStripe) {
    await stripeSends(request, "expired", work.slug);
    await page.goto(`/collection/${work.slug}`);
  } else {
    await page.getByRole("button", { name: "Cancel (back to the gallery)" }).click();
    await expect(page).toHaveURL(/\/acquisition\/cancelled\?work=/);
    await expect(page.getByRole("heading", { name: "Your acquisition was not completed" })).toBeVisible();
    await page.getByRole("link", { name: "Return to the work" }).click();
  }
  await expect(page.getByRole("button", { name: "Acquire this work" })).toBeVisible();
});

test("a webhook without Stripe's signature is refused", async ({ request }) => {
  const response = await request.post("/api/webhooks/stripe", {
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=forged" },
    data: JSON.stringify({ id: "evt_forged", type: "checkout.session.completed", data: { object: {} } }),
  });
  expect(response.status()).toBe(400);
});

test("a certificate link that does not exist is not found", async ({ page }) => {
  const response = await page.goto("/certificate/not-a-real-token");
  expect(response?.status()).toBe(404);
});
