/**
 * Sabian Symbol dataset validation — CLI entry point.
 *
 * Confirms a dataset has exactly 360 unique sign+degree records with no
 * missing degrees and consistent global indices. Run with:
 *   npm run validate:symbols [-- path/to/symbols.json]
 *
 * With no argument, validates the demo fixture and reports the (expected)
 * incomplete state.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { validateDataset, type ValidationResult } from "@/lib/sabian/validation";
import type { SabianSymbol } from "@/lib/sabian/model";

function main() {
  const arg = process.argv[2];
  if (arg) {
    const file = resolve(process.cwd(), arg);
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown[];
    const result = validateDataset(raw as SabianSymbol[], file);
    printResult(result);
    process.exit(result.ok ? 0 : 1);
  }
  const result = validateDataset(demoSabianSymbols, "demo fixture (src/lib/sabian/demo-data.ts)");
  printResult(result);
  // The demo fixture is intentionally incomplete; do not fail the build.
  if (!result.ok) {
    console.log("\nNOTE: The demo fixture is intentionally partial. Import an authorized dataset to proceed.");
  }
  process.exit(0);
}

function printResult(r: ValidationResult) {
  console.log(`Source:        ${r.source}`);
  console.log(`Total records: ${r.total}`);
  console.log(`Unique:        ${r.unique} / 360`);
  console.log(`Duplicates:    ${r.duplicates.length ? r.duplicates.join(", ") : "none"}`);
  console.log(`Missing:       ${r.missing.length}${r.missing.length ? " (first 10: " + r.missing.slice(0, 10).join(", ") + ")" : ""}`);
  console.log(`Invalid:       ${r.invalid.length ? r.invalid.slice(0, 5).join("; ") : "none"}`);
  console.log(`Licenses:      ${JSON.stringify(r.licenseStatuses)}`);
  console.log(`Result:        ${r.ok ? "PASS — exactly 360 unique records" : "INCOMPLETE (see above)"}`);
}

main();
