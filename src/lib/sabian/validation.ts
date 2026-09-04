/**
 * Sabian Symbol dataset validation — importable module.
 *
 * Strict requirements for an active complete dataset:
 *  - exactly 360 records
 *  - every sign has exactly 30 records
 *  - every sign-degree pair is unique
 *  - every global index is unique (1..360)
 *  - no missing indices
 *  - provenance fields populated on every record
 *  - non-demo mode contains no fixture markers
 *  - all 360 authoritative images are distinct
 *  - obvious indefinite-article errors are absent
 *  - project-owned original records have descriptive titles and review status
 *
 * The demo fixture (120 fictional placeholders) is always INCOMPLETE and
 * labeled accordingly. The CLI entry point (scripts/validate-symbols.ts)
 * wraps this for `npm run validate:symbols`.
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
  /** Every sign must have exactly 30 records. */
  perSignCounts: Record<string, number>;
  /** Duplicate global indices. */
  duplicateIndices: number[];
  /** Records with empty provenance (sourceAttribution / sourceVersion). */
  missingProvenance: string[];
  /** Non-demo records that still carry fixture markers in provenance/title. */
  fixtureMarkersInNonDemo: string[];
  /** Records whose license status does not authorize production use. */
  unresolvedLicenseRecords: string[];
  /** Canonical wording assigned to more than one degree. */
  duplicateCanonicalTexts: string[];
  /** Count of distinct non-empty canonical texts. */
  uniqueCanonicalTexts: number;
  /** Records beginning with an obvious A/An grammar error. */
  articleErrors: string[];
  /** Project-owned original records with generic sign-degree titles. */
  genericOriginalTitles: string[];
  /** Project-owned original records that still need editorial review. */
  pendingEditorialReview: string[];
  source: string;
  licenseStatuses: Record<string, number>;
}

const keyOf = (s: { sign: string; degree: number }) => `${s.sign} ${s.degree}`;

const FIXTURE_MARKERS = /\b(demo|fixture|placeholder|unrecorded)\b/i;

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

  // Unique sign-degree pairs.
  const seen = new Map<string, number>();
  const duplicates: string[] = [];
  for (const s of parsed) {
    const k = keyOf(s);
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    if (n > 0) duplicates.push(k);
  }

  // Unique global indices.
  const indexSeen = new Map<number, number>();
  const duplicateIndices: number[] = [];
  for (const s of parsed) {
    const n = indexSeen.get(s.globalIndex) ?? 0;
    indexSeen.set(s.globalIndex, n + 1);
    if (n > 0) duplicateIndices.push(s.globalIndex);
  }

  // Missing degrees.
  const missing: string[] = [];
  if (invalid.length === 0) {
    for (const sign of SIGNS) {
      for (let degree = 1; degree <= 30; degree++) {
        if (!seen.has(`${sign} ${degree}`)) missing.push(`${sign} ${degree}`);
      }
    }
  }

  // Per-sign counts.
  const perSignCounts: Record<string, number> = {};
  for (const sign of SIGNS) perSignCounts[sign] = 0;
  for (const s of parsed) perSignCounts[s.sign] = (perSignCounts[s.sign] ?? 0) + 1;

  // Provenance + fixture-marker checks.
  const missingProvenance: string[] = [];
  const fixtureMarkersInNonDemo: string[] = [];
  const unresolvedLicenseRecords: string[] = [];
  const articleErrors: string[] = [];
  const genericOriginalTitles: string[] = [];
  const pendingEditorialReview: string[] = [];
  for (const s of parsed) {
    if (!s.sourceAttribution.trim() || !s.sourceVersion.trim()) {
      missingProvenance.push(keyOf(s));
    }
    if (s.licenseStatus !== "demo-fixture") {
      const haystack = `${s.title} ${s.sourceAttribution} ${s.sourceVersion} ${s.canonicalSymbolText}`;
      if (FIXTURE_MARKERS.test(haystack)) {
        fixtureMarkersInNonDemo.push(keyOf(s));
      }
    }
    if (!["licensed", "public-domain-original", "project-owned-original"].includes(s.licenseStatus)) {
      unresolvedLicenseRecords.push(keyOf(s));
    }
    if (/^A\s+[aeiou]/i.test(s.canonicalSymbolText.trim())) {
      articleErrors.push(keyOf(s));
    }
    if (s.licenseStatus === "project-owned-original") {
      if (new RegExp(`^${s.sign}\\s+${s.degree}$`, "i").test(s.title.trim())) {
        genericOriginalTitles.push(keyOf(s));
      }
      if (s.editorialReviewStatus !== "reviewed") {
        pendingEditorialReview.push(keyOf(s));
      }
    }
  }

  const canonicalTextKeys = new Map<string, string[]>();
  for (const s of parsed) {
    const text = s.canonicalSymbolText.trim().toLocaleLowerCase();
    if (!text) continue;
    canonicalTextKeys.set(text, [...(canonicalTextKeys.get(text) ?? []), keyOf(s)]);
  }
  const duplicateCanonicalTexts = [...canonicalTextKeys.values()]
    .filter((keys) => keys.length > 1)
    .flat();

  const licenseStatuses: Record<string, number> = {};
  for (const s of parsed) {
    licenseStatuses[s.licenseStatus] = (licenseStatuses[s.licenseStatus] ?? 0) + 1;
  }

  const ok =
    invalid.length === 0 &&
    duplicates.length === 0 &&
    missing.length === 0 &&
    duplicateIndices.length === 0 &&
    parsed.length === 360 &&
    Object.values(perSignCounts).every((n) => n === 30) &&
    missingProvenance.length === 0 &&
    fixtureMarkersInNonDemo.length === 0 &&
    unresolvedLicenseRecords.length === 0 &&
    duplicateCanonicalTexts.length === 0 &&
    articleErrors.length === 0 &&
    genericOriginalTitles.length === 0 &&
    pendingEditorialReview.length === 0;

  return {
    ok,
    total: parsed.length,
    unique: seen.size,
    duplicates: [...new Set(duplicates)],
    missing,
    invalid,
    perSignCounts,
    duplicateIndices: [...new Set(duplicateIndices)],
    missingProvenance,
    fixtureMarkersInNonDemo,
    unresolvedLicenseRecords,
    duplicateCanonicalTexts,
    uniqueCanonicalTexts: canonicalTextKeys.size,
    articleErrors,
    genericOriginalTitles,
    pendingEditorialReview,
    source,
    licenseStatuses,
  };
}
