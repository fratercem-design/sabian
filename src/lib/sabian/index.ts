/**
 * Sabian Symbol dataset lookup — ACTIVE dataset.
 *
 * Resolution order:
 *  1. SABIAN_DATASET_PATH — an operator-supplied licensed dataset, read from
 *     disk at runtime so licensed corpora never enter the build artifact.
 *  2. The bundled original dataset (datasets/original-sabian-symbols.json) —
 *     first-party content written for this project, statically imported so it
 *     is traced into the deployment bundle.
 *  3. The 120-record demo fixture.
 *
 * Every candidate is validated before activation. An explicitly configured
 * dataset fails closed if unavailable or invalid; silently serving a different
 * corpus would conceal an operator error. The bundled dataset may still fall
 * back to the visibly incomplete demo fixture if the committed file is broken.
 *
 * The static import matters on serverless hosts. A path read with readFileSync
 * is invisible to Next's file tracer, so a runtime-only dataset is not bundled
 * into the lambda and silently degrades to the demo fixture in production.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import originalDataset from "../../../datasets/original-sabian-symbols.json";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { findSymbol, findSymbolByGlobalIndex, type SabianSymbol } from "@/lib/sabian/model";
import { validateDataset } from "@/lib/sabian/validation";

let active: SabianSymbol[] | null = null;

function validated(data: unknown, source: string): SabianSymbol[] | null {
  if (!Array.isArray(data)) return null;
  const symbols = data as SabianSymbol[];
  return validateDataset(symbols, source).ok ? symbols : null;
}

function loadActive(): SabianSymbol[] {
  if (active) return active;

  // 1. Operator-supplied licensed dataset, read at runtime and never bundled.
  const path = process.env.SABIAN_DATASET_PATH;
  if (path) {
    try {
      const fromDisk = validated(JSON.parse(readFileSync(path, "utf8")), path);
      if (fromDisk) {
        active = fromDisk;
        return active;
      }
      throw new Error(`SABIAN_DATASET_PATH=${path} failed dataset validation.`);
    } catch (err) {
      throw new Error(
        `[sabian] Configured dataset is unavailable; refusing to fall back: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  // 2. Bundled first-party original dataset.
  const bundled = validated(originalDataset, "datasets/original-sabian-symbols.json");
  if (bundled) {
    active = bundled;
    return active;
  }

  // 3. Demo fixture.
  active = demoSabianSymbols;
  return active;
}

export function getSymbolDataset(): SabianSymbol[] {
  return loadActive();
}

/** True when the ACTIVE dataset is the demo fixture (incomplete). */
export function isDemoDataset(): boolean {
  return loadActive() === demoSabianSymbols;
}

/** Stable hash of the exact active records, bounded to dataset content only. */
export function getActiveDatasetHash(): string {
  // Read only the explicitly selected file, without scanning the project.
  // Do not reuse the reading cache: readiness must notice a file changed
  // after this process first loaded it.
  const configuredPath = process.env.SABIAN_DATASET_PATH;
  const dataset = configuredPath
    ? validated(JSON.parse(readFileSync(configuredPath, "utf8")), configuredPath)
    : loadActive();
  if (!dataset) throw new Error("Configured dataset failed validation while checking freshness.");
  return createHash("sha256").update(JSON.stringify(dataset)).digest("hex");
}

export type ActiveDatasetKind =
  | "demo-fixture"
  | "project-owned-original"
  | "authorized-source";

export function getActiveDatasetKind(): ActiveDatasetKind {
  const dataset = loadActive();
  if (dataset === demoSabianSymbols) return "demo-fixture";
  return dataset.every((record) => record.licenseStatus === "project-owned-original")
    ? "project-owned-original"
    : "authorized-source";
}

/** Reset the cached active dataset. Only for tests. */
export function __resetActiveDataset(): void {
  active = null;
}

export { findSymbol, findSymbolByGlobalIndex };
