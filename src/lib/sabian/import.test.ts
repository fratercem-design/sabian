import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/sabian/validation";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { getSymbolDataset, isDemoDataset, __resetActiveDataset } from "@/lib/sabian/index";
import type { SabianSymbol } from "@/lib/sabian/model";
import { synthetic360, type SyntheticOptions } from "../../../test-fixtures/synthetic-dataset";

function raw360(options: SyntheticOptions = {}): SabianSymbol[] {
  return synthetic360(options) as SabianSymbol[];
}

describe("Sabian import pipeline (Task 4)", () => {
  it("accepts a complete licensed 360-record dataset", () => {
    const result = validateDataset(raw360(), "test");
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
    const result = validateDataset(raw360({ omitLast: true }), "test");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("Pisces 30");
  });

  it("rejects missing provenance", () => {
    const result = validateDataset(raw360({ blankProvenance: true }), "test");
    expect(result.ok).toBe(false);
    // Either the schema rejects the blank field (invalid) or the provenance
    // check catches it — both must make the import fail.
    expect(result.missingProvenance.length + result.invalid.length).toBeGreaterThan(0);
  });

  it("rejects duplicate sign-degree pairs and duplicate indices", () => {
    const ds = raw360() as Array<Record<string, unknown>>;
    ds[0] = { ...(ds[0] as object), ...(ds[1] as object), globalIndex: 2 } as Record<string, unknown>;
    const result = validateDataset(ds as SabianSymbol[], "test");
    expect(result.ok).toBe(false);
    expect(result.duplicates.length + result.duplicateIndices.length).toBeGreaterThan(0);
  });

  it("marks fixture markers in non-demo records", () => {
    const ds = raw360() as Array<Record<string, unknown>>;
    ds[0] = { ...(ds[0] as object), title: "Demo placeholder Aries 1" } as Record<string, unknown>;
    const result = validateDataset(ds as SabianSymbol[], "test");
    expect(result.ok).toBe(false);
    expect(result.fixtureMarkersInNonDemo).toContain("Aries 1");
  });

  it("rejects 360 structurally complete records without production-use rights", () => {
    const result = validateDataset(
      raw360({ licenseStatus: "needs-licensed-content" }),
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

  it("loads the imported 360-record dataset when SABIAN_DATASET_PATH is set", () => {
    process.env.SABIAN_DATASET_PATH = resolve(process.cwd(), "test-fixtures", "synthetic-360.json");
    __resetActiveDataset();
    try {
      const ds = getSymbolDataset();
      expect(ds.length).toBe(360);
      expect(isDemoDataset()).toBe(false);
    } finally {
      __resetActiveDataset();
    }
  });

  it("falls back to the demo fixture when SABIAN_DATASET_PATH is not set", () => {
    delete process.env.SABIAN_DATASET_PATH;
    __resetActiveDataset();
    try {
      const ds = getSymbolDataset();
      expect(ds.length).toBe(120);
      expect(isDemoDataset()).toBe(true);
    } finally {
      __resetActiveDataset();
    }
  });
});
