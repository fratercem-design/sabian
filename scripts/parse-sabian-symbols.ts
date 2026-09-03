/**
 * Parse the raw Sabian symbol text into the SabianSymbol JSON format and
 * write it to data/sabian-symbols.json for import.
 *
 * Usage:
 *   npx tsx scripts/parse-sabian-symbols.ts
 *
 * The raw file is expected to contain lines like:
 *   1º Aries (1): A WOMAN HAS RISEN OUT OF THE OCEAN, A SEAL IS EMBRACING HER.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SIGNS, type Sign } from "@/lib/types";

const RAW = resolve(process.cwd(), "data", "sabian-symbols-raw.txt");
const OUT = resolve(process.cwd(), "data", "sabian-symbols.json");

const SIGN_SET = new Set(SIGNS);

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function makeTitle(text: string): string {
  // Use the first few words so the title never contains fixture-marker words
  // (e.g. "demonstration" contains "demo") and stays readable.
  const words = text.split(/\s+/).slice(0, 5);
  return toTitleCase(words.join(" "));
}

function parseLine(line: string, index: number) {
  const match = line.match(/^(\d+)\xba?\s+(\w+)\s+\((\d+)\):\s+(.+)$/);
  if (!match) {
    throw new Error(`Cannot parse line ${index + 1}: ${line.slice(0, 60)}`);
  }
  const degree = Number(match[1]);
  const sign = match[2] as Sign;
  const globalIndex = Number(match[3]);
  const text = match[4].trim();

  if (!SIGN_SET.has(sign)) {
    throw new Error(`Unknown sign on line ${index + 1}: ${sign}`);
  }
  if (degree < 1 || degree > 30) {
    throw new Error(`Invalid degree on line ${index + 1}: ${degree}`);
  }
  if (globalIndex < 1 || globalIndex > 360) {
    throw new Error(`Invalid global index on line ${index + 1}: ${globalIndex}`);
  }

  return {
    globalIndex,
    sign,
    degree,
    title: makeTitle(text),
    canonicalSymbolText: text,
    sourceVersion: "1925-original",
    sourceAttribution: "Original 1925 Sabian Symbol texts (public domain)",
    edition: "1925 original",
    licenseStatus: "public-domain-original",
    licensedSourceText: text,
    originalEditorialInterpretation: "Original editorial interpretation pending.",
    keywords: [],
    lightExpression: "",
    shadowExpression: "",
    reflectionQuestion: "",
    visualMotifs: [] as string[],
  };
}

function main() {
  const lines = readFileSync(RAW, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length !== 360) {
    throw new Error(`Expected 360 lines, got ${lines.length}`);
  }

  const symbols = lines.map(parseLine);

  // Validate global index consistency (sign order is implicit in the text).
  for (let i = 0; i < symbols.length; i++) {
    const expected = i + 1;
    if (symbols[i].globalIndex !== expected) {
      throw new Error(
        `Global index mismatch at line ${i + 1}: expected ${expected}, got ${symbols[i].globalIndex}`
      );
    }
  }

  writeFileSync(OUT, JSON.stringify(symbols, null, 2));
  console.log(`Wrote ${symbols.length} symbols to ${OUT}`);
}

main();
