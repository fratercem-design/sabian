/**
 * DEMO fixture Sabian symbol dataset — clearly labeled development content.
 *
 * IMPORTANT: This is NOT an authorized or canonical set of 360 Sabian
 * symbol texts, and it makes no claim to be. Every record uses an
 * UNMISTAKABLY FICTIONAL placeholder title ("Demo image for Aries 1") so
 * that no published or near-canonical wording (e.g. "A woman rises from the
 * sea") is reproduced or implied. Nothing has been scraped or copied.
 *
 * Coverage: 120 records (degrees 1–10 of each sign) so the engine and
 * interface can be exercised. All records have licenseStatus
 * "demo-fixture"; licensedSourceText is empty; the editorial fields are
 * original generic commentary written for this project.
 *
 * Required before production/commercial use: import an authorized 360-symbol
 * dataset and run `npm run validate:symbols`. See README and
 * docs/data-license.md.
 */

import { SabianSymbolSchema, type SabianSymbol } from "@/lib/sabian/model";
import { SIGNS, type Sign } from "@/lib/types";

const DEMO_COVERAGE = 10; // degrees 1..10 of each sign

/** Unmistakably fictional placeholder title — never canonical wording. */
function demoTitle(sign: Sign, degree: number): string {
  return `Demo image for ${sign} ${degree}`;
}

function demoEntry(sign: Sign, degree: number): SabianSymbol {
  const signIndex = SIGNS.indexOf(sign);
  const globalIndex = signIndex * 30 + degree;
  const title = demoTitle(sign, degree);
  return SabianSymbolSchema.parse({
    globalIndex,
    sign,
    degree,
    title,
    sourceVersion: "demo-fixture-2",
    sourceAttribution:
      "Original demo fixture written for The Sabian Story (fictional placeholder; not a Sabian symbol text)",
    licenseStatus: "demo-fixture",
    licensedSourceText: "",
    originalEditorialInterpretation: `This is a demo placeholder for the Sabian degree ${sign} ${degree}. It deliberately carries no canonical or published meaning; it exists only to exercise the reading interface until an authorized dataset is imported.`,
    keywords: ["demo", "placeholder"],
    lightExpression: "A neutral demo placeholder with no interpretive claim.",
    shadowExpression: "A neutral demo placeholder with no interpretive claim.",
    reflectionQuestion: `This demo degree (${sign} ${degree}) is a placeholder with no authorized image. What would your own image for it be?`,
    visualMotifs: ["celestial geometry"],
  });
}

export const demoSabianSymbols: SabianSymbol[] = SIGNS.flatMap((sign) =>
  Array.from({ length: DEMO_COVERAGE }, (_, i) => demoEntry(sign, i + 1))
);
