/**
 * Sabian Symbol dataset import (Task 4).
 *
 * Validates an operator-supplied, licensed or public-domain 360-record dataset
 * and writes it to the path configured by SABIAN_DATASET_PATH. That path is
 * read at runtime by src/lib/sabian/index.ts, so the corpus never enters the
 * build artifact and never risks accidental commit.
 *
 * Usage:
 *   SABIAN_DATASET_PATH=/path/to/active-dataset.json npm run import:symbols -- path/to/source.json [--source "description"]
 *
 * Requirements (all must hold or the import FAILS):
 *  - exactly 360 records
 *  - every sign has exactly 30 records
 *  - every sign-degree pair is unique
 *  - every global index is unique (1..360)
 *  - no missing indices
 *  - provenance fields populated (sourceAttribution, sourceVersion)
 *  - non-demo records contain no fixture markers and carry canonicalSymbolText
 *  - every canonical text is distinct, with no obvious article errors
 *  - project-owned originals have descriptive titles and completed automated or editorial checks
 *
 * This script never invents, scrapes, or copies Sabian content. It only
 * validates and imports a file the operator supplies.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { validateDataset } from "../src/lib/sabian/validation.ts";
import type { SabianSymbol } from "../src/lib/sabian/model.ts";

const OUT = process.env.SABIAN_DATASET_PATH ? resolve(process.env.SABIAN_DATASET_PATH) : null;

function fail(msg: string): never {
  console.error(`IMPORT FAILED: ${msg}`);
  process.exit(1);
}

function main() {
  if (!OUT) {
    fail(
      "SABIAN_DATASET_PATH is not set. Set it to an absolute path outside the project root, then rerun:\n" +
        "  SABIAN_DATASET_PATH=/path/to/dataset.json npm run import:symbols -- path/to/source.json"
    );
  }
  const fileArg = process.argv[2];
  if (!fileArg) fail("usage: SABIAN_DATASET_PATH=/path/to/dataset.json npm run import:symbols -- path/to/source.json [--source desc]");
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
  console.log(`Unique texts:  ${result.uniqueCanonicalTexts} / ${result.total}`);
  console.log(`Article errors:${result.articleErrors.length.toString().padStart(3, " ")}`);
  console.log(`Generic titles:${result.genericOriginalTitles.length.toString().padStart(3, " ")}`);
  console.log(`Review pending:${result.pendingEditorialReview.length.toString().padStart(3, " ")}`);
  console.log(`Per-sign 30:   ${Object.entries(result.perSignCounts).every(([, n]) => n === 30)}`);

  if (!result.ok) fail(`dataset does not meet all 360-symbol requirements (see above)`);

  mkdirSync(dirname(OUT!), { recursive: true });
  writeFileSync(OUT!, JSON.stringify(symbols, null, 2));
  console.log(`\nIMPORT OK — wrote ${symbols.length} records to ${OUT}`);
  console.log("The application will load this validated dataset automatically on its next start.");
}

main();
