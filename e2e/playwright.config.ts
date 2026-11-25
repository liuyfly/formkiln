import { defineConfig, devices } from "@playwright/test";
import { ADMIN_URL, API_URL, HOSTED_URL, STORAGE_STATE } from "./lib/env";

/**
 * Runs against a server started separately (compose.yml) and the admin and hosted apps of this
 * checkout, built beforehand (`pnpm build`). Locally, PLAYWRIGHT_CHANNEL=chrome uses the
 * installed Chrome instead of downloading Chromium.
 */
const channel = process.env.PLAYWRIGHT_CHANNEL;
const browser = { ...devices["Desktop Chrome"], ...(channel ? { channel } : {}) };
const apps = { FORMKILN_API_URL: API_URL, NEXT_TELEMETRY_DISABLED: "1" };

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "hosted", testMatch: /hosted\..*\.spec\.ts/, use: { ...browser, baseURL: HOSTED_URL } },
    { name: "admin-setup", testMatch: /admin\.setup\.ts/, use: { ...browser, baseURL: ADMIN_URL } },
    {
      name: "admin",
      testMatch: /admin\..*\.spec\.ts/,
      dependencies: ["admin-setup"],
      use: { ...browser, baseURL: ADMIN_URL, storageState: STORAGE_STATE },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @formkiln/hosted start",
      url: `${HOSTED_URL}/`,
      env: apps,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @formkiln/admin start",
      url: `${ADMIN_URL}/login`,
      env: apps,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
