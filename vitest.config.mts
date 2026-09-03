import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";
import { TEST_UNIT_DB, TEST_ART_CACHE_DIR } from "./vitest.tmpdir.mts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Database-backed service + integration specs run under
    // vitest.integration.config.mts with their own isolated database; keep them
    // out of the fast unit run so suites are not double-counted.
    exclude: [
      ...configDefaults.exclude,
      "src/**/*.integration.test.ts",
      "src/lib/reading/service.test.ts",
    ],
    // Give every test run an isolated temporary database and artwork cache.
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: `file:${TEST_UNIT_DB}`,
      ART_CACHE_DIR: TEST_ART_CACHE_DIR,
      SABIAN_DATASET_PATH: "C:\\Users\\johnb\\sabian-quarantine\\full-dataset.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
