import { SIGNS, type Sign } from "@/lib/types";
import { SabianSymbolSchema, type SabianSymbol } from "@/lib/sabian/model";

export interface SyntheticOptions {
  omitLast?: boolean;
  blankProvenance?: boolean;
  licenseStatus?: "licensed" | "public-domain-original" | "needs-licensed-content" | "demo-fixture";
  sourceAttribution?: string;
}


/** Build a synthetic 360-record dataset for pipeline testing (not shipped). */
export function synthetic360(options: SyntheticOptions = {}): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const sourceAttribution = options.blankProvenance
    ? ""
    : (options.sourceAttribution ?? "synthetic test dataset");
  const licenseStatus = options.licenseStatus ?? "licensed";

  for (const sign of SIGNS as readonly Sign[]) {
    for (let d = 1; d <= 30; d++) {
      if (options.omitLast && sign === "Pisces" && d === 30) continue;
      const si = (SIGNS as readonly Sign[]).indexOf(sign);
      const globalIndex = si * 30 + d;
      out.push({
        globalIndex,
        sign,
        degree: d,
        title: `Test licensed record ${sign} ${d}`,
        canonicalSymbolText: `Authorized test wording for ${sign} ${d}`,
        sourceVersion: "test-v1",
        sourceAttribution,
        edition: "Test 2026",
        licenseStatus,
        originalEditorialInterpretation: "Test commentary.",
        keywords: ["test"],
        lightExpression: "Test.",
        shadowExpression: "Test.",
        reflectionQuestion: "Test?",
        visualMotifs: ["test"],
      });
    }
  }

  return out;
}

/** Parsed/validated synthetic 360-record dataset. */
export function parsedSynthetic360(options: SyntheticOptions = {}): SabianSymbol[] {
  return synthetic360(options).map((r) => SabianSymbolSchema.parse(r));
}
