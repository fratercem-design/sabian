/**
 * Sabian Symbol dataset lookup — ACTIVE dataset.
 *
 * Loads the imported authorized dataset (src/lib/sabian/generated/
 * full-dataset.json) when present, and falls back to the demo fixture
 * otherwise. The active dataset is validated at load time; an invalid
 * generated dataset falls back to the demo fixture rather than shipping
 * broken content.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { findSymbol, findSymbolByGlobalIndex, type SabianSymbol } from "@/lib/sabian/model";
import { validateDataset } from "@/lib/sabian/validation";

let active: SabianSymbol[] | null = null;

function loadActive(): SabianSymbol[] {
  if (active) return active;
  const path = join(process.cwd(), "src", "lib", "sabian", "generated", "full-dataset.json");
  try {
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf8")) as SabianSymbol[];
      const validation = Array.isArray(data)
        ? validateDataset(data, "generated/full-dataset.json")
        : null;
      if (validation?.ok) {
        active = data;
        return active;
      }
    }
  } catch {
    // No imported dataset yet — demo fixture.
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

export { findSymbol, findSymbolByGlobalIndex };
