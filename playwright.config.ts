import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * Desktop (1440) and mobile (390) in Chromium and WebKit — WebKit catches
 * Safari differences in blend modes, clip-paths and gradients.
 */
export default defineConfig({
  testDir: "tests",
  testMatch: ["e2e/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: true,
  // GitHub's runners have two cores. A test that passes on its retry is
  // reported as flaky, never silently: look into it.
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  // Against the dev server, a route's first visit waits on compilation.
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "line",
  use: { baseURL },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop-webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // CI tests the production build: E2E_SERVER="npx next start --port 3100".
    command: process.env.E2E_SERVER ?? `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
