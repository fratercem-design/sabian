/**
 * Sabian Symbol dataset validation — importable module.
 *
 * Confirms a dataset has exactly 360 unique sign+degree records with no
 * missing degrees and consistent global indices. The CLI entry point
 * (scripts/validate-symbols.ts) wraps this for `npm run validate:symbols`.
 */

import { SabianSymbolSchema, type SabianSymbol } from "@/lib/sabian/model";
import { SIGNS } from "@/lib/types";

export interface ValidationResult {
  ok: boolean;
  total: number;
  unique: number;
  duplicates: string[];
  missing: string[];
  invalid: string[];
  source: string;
  licenseStatuses: Record<string, number>;
}

const keyOf = (s: { sign: string; degree: number }) => `${s.sign} ${s.degree}`;

export function validateDataset(symbols: SabianSymbol[], source: string): ValidationResult {
  const invalid: string[] = [];
  const parsed: SabianSymbol[] = [];

  for (const raw of symbols) {
    const result = SabianSymbolSchema.safeParse(raw);
    if (!result.success) {
      invalid.push(`${keyOf(raw as { sign: string; degree: number })}: ${result.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    parsed.push(result.data);
  }

  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const s of parsed) {
    const k = keyOf(s);
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    if (n > 0) duplicates.push(k);
  }

  const missing: string[] = [];
  if (invalid.length === 0) {
    for (const sign of SIGNS) {
      for (let degree = 1; degree <= 30; degree++) {
        if (!seen.has(`${sign} ${degree}`)) missing.push(`${sign} ${degree}`);
      }
    }
  }

  const licenseStatuses: Record<string, number> = {};
  for (const s of parsed) {
    licenseStatuses[s.licenseStatus] = (licenseStatuses[s.licenseStatus] ?? 0) + 1;
  }

  const ok = invalid.length === 0 && duplicates.length === 0 && missing.length === 0 && parsed.length === 360;

  return {
    ok,
    total: parsed.length,
    unique: seen.size,
    duplicates: [...new Set(duplicates)],
    missing,
    invalid,
    source,
    licenseStatuses,
  };
}
