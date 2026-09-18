import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// A pre-installed Chromium (e.g. in CI containers) can be used instead of a downloaded one.
const chromiumPath = process.env.PW_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:1420",
    trace: "retain-on-failure",
    locale: "de-DE",
  },
  webServer: {
    command: "npx vite --port 1420 --strictPort",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Allow overriding the browser binary (e.g. a pre-installed Chromium in CI containers).
        launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
      },
    },
  ],
});
