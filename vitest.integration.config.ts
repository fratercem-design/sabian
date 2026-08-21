import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Integration test config — runs the database-backed service tests against a
 * real SQLite file. Kept separate from unit tests so CI can run fast unit
 * tests and heavier integration tests independently.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/reading/service.test.ts"],
    env: {
      DATABASE_URL: "file:./data/sabian.test.db",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
