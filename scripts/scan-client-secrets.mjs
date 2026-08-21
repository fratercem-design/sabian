/**
 * Sentinel-secret scan of the client bundle.
 *
 * After `next build`, scans every file in .next/static for patterns that
 * would indicate a secret or provider credential leaked into the browser
 * bundle (API keys, DATABASE_URL, provider credentials, generic secret
 * naming). Exits non-zero if anything matches, so CI can gate on it.
 */

import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const STATIC_DIR = join(process.cwd(), ".next", "static");

const PATTERNS = [
  /DATABASE_URL/,
  /TEXT_API_KEY/,
  /IMAGE_API_KEY/,
  /GEOCODING_API_KEY/,
  /GEOCODING_API_URL/,
  /API[_-]?KEY/i,
  /api[_-]?key/i,
  /sk-[A-Za-z0-9]{12,}/, // OpenAI-style keys
  /AIza[0-9A-Za-z_-]{20,}/, // Google-style keys
  /secret/i,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
];

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(STATIC_DIR)) {
  console.error("No .next/static directory. Run `npm run build` first.");
  process.exit(1);
}

const files = walk(STATIC_DIR).filter((f) => /\.(js|mjs|css|html)$/.test(f));
const hits = [];

for (const f of files) {
  const content = readFileSync(f, "utf8");
  for (const pattern of PATTERNS) {
    if (pattern.test(content)) {
      hits.push(`${f} matched ${pattern}`);
      break;
    }
  }
}

if (hits.length > 0) {
  console.error("SENTINEL-SECRET SCAN FAILED:");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}

console.log(`Sentinel-secret scan passed: ${files.length} client files, 0 secret patterns found.`);
