/**
 * Shared test-temp-dir helper: computes the unique per-run temp directory so
 * the vitest configs and the setup file agree on the same paths.
 */

import { tmpdir } from "node:os";
import path from "node:path";

const runId = `${process.pid}-${Date.now()}`;
export const TEST_TMP_ROOT = path.join(tmpdir(), "sabian-story-tests", runId);
export const TEST_ART_CACHE_DIR = path.join(TEST_TMP_ROOT, "art-cache");
export const TEST_UNIT_DB = path.join(TEST_TMP_ROOT, "sabian.unit.db");
export const TEST_INTEGRATION_DB = path.join(TEST_TMP_ROOT, "sabian.integration.db");
