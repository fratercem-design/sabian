/**
 * Sabian Symbol dataset lookup — ACTIVE dataset.
 *
 * Loads the imported authorized dataset from the path set in the
 * SABIAN_DATASET_PATH environment variable when present, and falls back to the
 * demo fixture otherwise. The active dataset is validated at load time; an
 * invalid dataset falls back to the demo fixture rather than shipping broken
 * content.
 *
 * The dataset is intentionally loaded at runtime from outside the build trace
 * so that operator-only corpora are never bundled into deployment artifacts.
 */

import { readFileSync } from "node:fs";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { findSymbol, findSymbolByGlobalIndex, type SabianSymbol } from "@/lib/sabian/model";
import { validateDataset } from "@/lib/sabian/validation";

let active: SabianSymbol[] | null = null;

function loadActive(): SabianSymbol[] {
  if (active) return active;

  const path = process.env.SABIAN_DATASET_PATH;
  if (path) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8")) as SabianSymbol[];
      const validation = Array.isArray(data)
        ? validateDataset(data, path)
        : null;
      if (validation?.ok) {
        active = data;
        return active;
      }
    } catch {
      // Fall through to demo fixture if the configured dataset is unreadable.
    }
  }

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
