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
    include: ["src/lib/reading/service.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: `file:${TEST_INTEGRATION_DB}`,
      ART_CACHE_DIR: TEST_ART_CACHE_DIR,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
