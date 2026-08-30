/**
 * Sabian Symbol dataset import (Task 4).
 *
 * Validates a user-supplied, licensed or public-domain 360-record dataset and,
 * on success, writes it to src/lib/sabian/generated/full-dataset.json as the
 * ACTIVE dataset. The dataset is then loaded by src/lib/sabian/index.ts in
 * place of the demo fixture.
 *
 * Usage:
 *   npm run import:symbols -- path/to/dataset.json [--source "description"]
 *
 * Requirements (all must hold or the import FAILS):
 *  - exactly 360 records
 *  - every sign has exactly 30 records
 *  - every sign-degree pair is unique
 *  - every global index is unique (1..360)
 *  - no missing indices
 *  - provenance fields populated (sourceAttribution, sourceVersion)
 *  - non-demo records contain no fixture markers and carry canonicalSymbolText
 *
 * This script never invents, scrapes, or copies Sabian content. It only
 * validates and imports a file the operator supplies.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDataset } from "../src/lib/sabian/validation.ts";
import type { SabianSymbol } from "../src/lib/sabian/model.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "src", "lib", "sabian", "generated", "full-dataset.json");

function fail(msg: string): never {
  console.error(`IMPORT FAILED: ${msg}`);
  process.exit(1);
}

function main() {
  const fileArg = process.argv[2];
  if (!fileArg) fail("usage: npm run import:symbols -- path/to/dataset.json [--source desc]");
  const sourceFlag = process.argv.find((a) => a.startsWith("--source="));
  const sourceDesc = sourceFlag ? sourceFlag.split("=")[1] : fileArg;

  const file = resolve(process.cwd(), fileArg);
  if (!existsSync(file)) fail(`file not found: ${file}`);
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const symbols = (Array.isArray(raw) ? raw : raw.symbols ?? raw.records ?? []) as SabianSymbol[];

  const result = validateDataset(symbols, sourceDesc);
  console.log(`Source:        ${result.source}`);
  console.log(`Total:         ${result.total}`);
  console.log(`Unique pairs:  ${result.unique}`);
  console.log(`Duplicates:    ${result.duplicates.length ? result.duplicates.join(", ") : "none"}`);
  console.log(`Missing:       ${result.missing.length ? result.missing.slice(0, 5).join(", ") + "…" : "none"}`);
  console.log(`Duplicate idx: ${result.duplicateIndices.length ? result.duplicateIndices.join(", ") : "none"}`);
  console.log(`Provenance:    ${result.missingProvenance.length ? result.missingProvenance.join(", ") : "all populated"}`);
  console.log(`Fixture marks: ${result.fixtureMarkersInNonDemo.length ? result.fixtureMarkersInNonDemo.join(", ") : "none"}`);
  console.log(`Licenses:      ${JSON.stringify(result.licenseStatuses)}`);
  console.log(`Rights gaps:   ${result.unresolvedLicenseRecords.length}`);
  console.log(`Per-sign 30:   ${Object.entries(result.perSignCounts).every(([, n]) => n === 30)}`);

  if (!result.ok) fail(`dataset does not meet all 360-symbol requirements (see above)`);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(symbols, null, 2));
  console.log(`\nIMPORT OK — wrote ${symbols.length} records to ${OUT}`);
  console.log("The application will load this validated dataset automatically on its next start.");
}

main();
