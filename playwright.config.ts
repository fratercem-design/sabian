import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.E2E_PORT ?? "3173");
if (!Number.isInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65_535) {
  throw new Error("E2E_PORT must be an integer between 1024 and 65535.");
}
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: e2eBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch:
        /(journey|birth-time-integrity|browser-quality|consent-timing|metadata|accessibility)\.spec\.ts/,
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.spec\.ts/,
    },
    {
      name: "unknown-time-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: /unknown-time\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run dev -- -H 127.0.0.1 -p ${e2ePort}`,
    url: e2eBaseUrl,
    // Never accept an unrelated app already listening on the test port.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Isolated runtime state: the browser tests never touch the real
      // database or artwork cache.
      DATABASE_URL: "file:./.e2e-tmp/sabian.e2e.db",
      ART_CACHE_DIR: "./.e2e-tmp/art-cache",
    },
  },
});
