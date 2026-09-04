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
 * Every candidate is validated before activation; an invalid one falls through
 * to the next rather than shipping broken content.
 *
 * The static import matters on serverless hosts. A path read with readFileSync
 * is invisible to Next's file tracer, so a runtime-only dataset is not bundled
 * into the lambda and silently degrades to the demo fixture in production.
 */

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
      console.error(
        `[sabian] SABIAN_DATASET_PATH=${path} failed validation; ignoring it.`
      );
    } catch (err) {
      // Never fail silently here: a configured-but-unusable dataset is a
      // deployment error, and the fallback below would otherwise hide it.
      console.error(
        `[sabian] Could not read SABIAN_DATASET_PATH=${path}: ` +
          `${err instanceof Error ? err.message : String(err)}`
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

/** Reset the cached active dataset. Only for tests. */
export function __resetActiveDataset(): void {
  active = null;
}

export { findSymbol, findSymbolByGlobalIndex };
