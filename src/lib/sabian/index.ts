/**
 * Sabian Symbol dataset lookup.
 *
 * Currently resolves against the demo fixture dataset. To switch to an
 * authorized 360-entry dataset, replace the import below (see
 * docs/data-license.md).
 */

import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { findSymbol, findSymbolByGlobalIndex } from "@/lib/sabian/model";
import type { SabianSymbol } from "@/lib/sabian/model";

export function getSymbolDataset(): SabianSymbol[] {
  return demoSabianSymbols;
}

export { findSymbol, findSymbolByGlobalIndex };
