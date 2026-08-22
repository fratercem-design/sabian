/**
 * Sabian Symbol dataset lookup — ACTIVE dataset.
 *
 * Loads the imported authorized dataset (src/lib/sabian/generated/
 * full-dataset.json) when present, and falls back to the demo fixture
 * otherwise. The active dataset is validated at load time; an invalid
 * generated dataset falls back to the demo fixture rather than shipping
 * broken content.
 */

import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { findSymbol, findSymbolByGlobalIndex, type SabianSymbol } from "@/lib/sabian/model";

let active: SabianSymbol[] | null = null;

function loadActive(): SabianSymbol[] {
  if (active) return active;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const generated = require("@/lib/sabian/generated/full-dataset.json") as { default?: SabianSymbol[] } | SabianSymbol[];
    const data = Array.isArray(generated) ? generated : generated.default;
    if (data && data.length === 360) {
      active = data;
      return active;
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
