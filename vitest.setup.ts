/**
 * Vitest setup: ensures the unique per-run temp directory and artwork cache
 * exist. The paths come from vitest.tmpdir.ts (shared with the configs), so
 * every test run uses an isolated temporary database and artwork cache and
 * never touches existing data or generated assets.
 */

import { mkdirSync } from "node:fs";
import { TEST_ART_CACHE_DIR } from "./vitest.tmpdir.mts";

mkdirSync(TEST_ART_CACHE_DIR, { recursive: true });
