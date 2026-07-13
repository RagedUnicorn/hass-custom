import { defineConfig, devices } from "@playwright/test";

// The suite runs against the mock-hass harness (dev/harness.html) — never
// against a real Home Assistant.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : "list",
  use: {
    baseURL: "http://localhost:5199",
    trace: "on-first-retry",
  },
  projects: [
    {
      // Wide viewport: drilldown renders as a centered dialog (≥600px).
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      // Narrow viewport: drilldown renders as a bottom sheet (<600px).
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 5199 --strictPort",
    url: "http://localhost:5199/dev/harness.html",
    reuseExistingServer: !process.env.CI,
  },
});
