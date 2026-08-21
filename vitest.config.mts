import { defineConfig } from "vitest/config";
import path from "node:path";
import { TEST_UNIT_DB, TEST_ART_CACHE_DIR } from "./vitest.tmpdir.mts";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Give every test run an isolated temporary database and artwork cache.
    setupFiles: ["./vitest.setup.ts"],
    env: {
      DATABASE_URL: `file:${TEST_UNIT_DB}`,
      ART_CACHE_DIR: TEST_ART_CACHE_DIR,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
