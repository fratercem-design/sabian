import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/sabian/validation";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian/index";
import { SIGNS, type Sign } from "@/lib/types";

/** Build a synthetic 360-record dataset for pipeline testing (not shipped). */
function synthetic360(
  overrides: {
    omitLast?: boolean;
    blankProvenance?: boolean;
    licenseStatus?: "licensed" | "needs-licensed-content" | "demo-fixture";
  } = {}
): unknown[] {
  const out: unknown[] = [];
  for (const sign of SIGNS as readonly Sign[]) {
    for (let d = 1; d <= 30; d++) {
      if (overrides.omitLast && sign === "Pisces" && d === 30) continue;
      const si = (SIGNS as readonly Sign[]).indexOf(sign);
      out.push({
        globalIndex: si * 30 + d,
        sign,
        degree: d,
        title: `Test licensed record ${sign} ${d}`,
        canonicalSymbolText: `Authorized test wording for ${sign} ${d}`,
        sourceVersion: "test-v1",
        sourceAttribution: overrides.blankProvenance ? "" : "Test License Holder",
        edition: "Test 2026",
        licenseStatus: overrides.licenseStatus ?? "licensed",
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

describe("Sabian import pipeline (Task 4)", () => {
  it("accepts a complete licensed 360-record dataset", () => {
    const result = validateDataset(synthetic360() as never, "test");
    expect(result.ok).toBe(true);
    expect(result.total).toBe(360);
    expect(result.duplicates).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(result.duplicateIndices).toHaveLength(0);
    expect(Object.values(result.perSignCounts).every((n) => n === 30)).toBe(true);
    expect(result.missingProvenance).toHaveLength(0);
    expect(result.fixtureMarkersInNonDemo).toHaveLength(0);
    expect(result.licenseStatuses).toEqual({ licensed: 360 });
  });

  it("rejects an incomplete dataset (359 records)", () => {
    const result = validateDataset(synthetic360({ omitLast: true }) as never, "test");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Pisces 30");
  });

  it("rejects missing provenance", () => {
    const result = validateDataset(synthetic360({ blankProvenance: true }) as never, "test");
    expect(result.ok).toBe(false);
    // Either the schema rejects the blank field (invalid) or the provenance
    // check catches it — both must make the import fail.
    expect(result.missingProvenance.length + result.invalid.length).toBeGreaterThan(0);
  });

  it("rejects duplicate sign-degree pairs and duplicate indices", () => {
    const ds = synthetic360() as Array<Record<string, unknown>>;
    ds[0] = { ...(ds[0] as object), ...(ds[1] as object), globalIndex: 2 } as Record<string, unknown>;
    const result = validateDataset(ds as never, "test");
    expect(result.ok).toBe(false);
    expect(result.duplicates.length + result.duplicateIndices.length).toBeGreaterThan(0);
  });

  it("marks fixture markers in non-demo records", () => {
    const ds = synthetic360() as Array<Record<string, unknown>>;
    ds[0] = { ...(ds[0] as object), title: "Demo placeholder Aries 1" } as Record<string, unknown>;
    const result = validateDataset(ds as never, "test");
    expect(result.ok).toBe(false);
    expect(result.fixtureMarkersInNonDemo).toContain("Aries 1");
  });

  it("rejects 360 structurally complete records without production-use rights", () => {
    const result = validateDataset(
      synthetic360({ licenseStatus: "needs-licensed-content" }) as never,
      "test"
    );
    expect(result.ok).toBe(false);
    expect(result.unresolvedLicenseRecords).toHaveLength(360);
  });

  it("demo dataset is always labeled incomplete and never accepted as licensed", () => {
    const result = validateDataset(demoSabianSymbols, "demo");
    expect(result.ok).toBe(false);
    expect(result.licenseStatuses).toEqual({ "demo-fixture": 120 });
    expect(result.unresolvedLicenseRecords).toHaveLength(120);
    expect(result.missing.length).toBe(240);
  });

  it("getSymbolDataset loads the imported 360-record dataset when present", () => {
    const ds = getSymbolDataset();
    expect(ds.length).toBe(360);
    expect(isDemoDataset()).toBe(false);
  });
});
