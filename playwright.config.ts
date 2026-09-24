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
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
