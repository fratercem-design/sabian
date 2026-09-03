/**
 * Build trace assertion — fails if the Next.js server trace contains files
 * that must never be deployed: local SQLite databases, operator-only raw
 * corpora, tests, or scripts.
 *
 * Usage: npm run build && node scripts/assert-build-trace.mjs
 */

import { readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FORBIDDEN = [
  /data\/.+\.db/i,
  /data\/.+\.db-[shm|wal]/i,
  /data\/sabian-symbols-raw\.txt/i,
  /data\/sabian-symbols\.json/i,
  /data\/quarantine/i,
  /src\/lib\/sabian\/generated\/full-dataset\.json/i,
  /e2e\//i,
  /scripts\//i,
  /\.test\./i,
  /\.spec\./i,
];

async function main() {
  const nftFiles = [];
  for await (const file of glob(".next/**/*.nft.json", { cwd: ROOT })) {
    nftFiles.push(file);
  }
  const violations = [];
  for (const file of nftFiles) {
    const content = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
    for (const entry of content.files ?? []) {
      for (const pattern of FORBIDDEN) {
        if (pattern.test(entry)) {
          violations.push({ file, entry });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error("BUILD TRACE VIOLATIONS:");
    for (const v of violations) {
      console.error(`  ${v.file} includes ${v.entry}`);
    }
    process.exit(1);
  }

  console.log(`Checked ${nftFiles.length} NFT manifest(s). No forbidden files found.`);
}

main().catch((error) => {
  console.error("Build trace assertion failed:", error);
  process.exit(1);
});
