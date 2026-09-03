import { defineConfig } from "vitest/config";
import path from "node:path";
import { TEST_INTEGRATION_DB, TEST_ART_CACHE_DIR } from "./vitest.tmpdir.mts";

/**
 * Integration test config — runs the database-backed service tests against a
 * real SQLite file. Kept separate from unit tests so CI can run fast unit
 * tests and heavier integration tests independently. Uses an isolated
 * temporary database and artwork cache.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Both integration files use the same isolated SQLite file; run them one at
    // a time so they never hold concurrent connections to it.
    fileParallelism: false,
    include: [
      "src/lib/reading/service.test.ts",
      "src/lib/places/__tests__/live-journey.integration.test.ts",
    ],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: `file:${TEST_INTEGRATION_DB}`,
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
