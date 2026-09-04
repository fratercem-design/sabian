import { resolve } from "node:path";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/sabian/validation";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { getActiveDatasetHash, getSymbolDataset, isDemoDataset, __resetActiveDataset } from "@/lib/sabian/index";
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

  // Previously this asserted that an unset SABIAN_DATASET_PATH yields the demo
  // fixture. That is no longer true, and the old expectation was the shape of
  // a real production bug: the dataset loaded only via readFileSync, was never
  // bundled, and the "correct" demo fallback silently served 120 placeholder
  // records in production. The demo fixture is now the LAST resort, not the
  // default. What is worth pinning instead is the precedence.
  it("prefers an operator-supplied dataset over the bundled original", () => {
    const previous = process.env.SABIAN_DATASET_PATH;
    process.env.SABIAN_DATASET_PATH = resolve("test-fixtures/synthetic-360.json");
    __resetActiveDataset();
    try {
      const ds = getSymbolDataset();
      expect(ds).toHaveLength(360);
      expect(isDemoDataset()).toBe(false);
      // The synthetic fixture, not the bundled original.
      expect(ds[0].sourceAttribution).toBe("synthetic test dataset");
    } finally {
      if (previous === undefined) delete process.env.SABIAN_DATASET_PATH;
      else process.env.SABIAN_DATASET_PATH = previous;
      __resetActiveDataset();
    }
  });

});

describe("bundled dataset activation", () => {
  // Regression guard for a silent production failure: the dataset was once
  // loaded ONLY via readFileSync(SABIAN_DATASET_PATH). That path is invisible
  // to Next's file tracer, so the file was never bundled into the serverless
  // lambda and production silently served the 120-record demo fixture while
  // every local check passed. The bundled dataset must activate on its own.
  it("activates the bundled original dataset with no env var set", () => {
    const previous = process.env.SABIAN_DATASET_PATH;
    delete process.env.SABIAN_DATASET_PATH;
    __resetActiveDataset();
    try {
      expect(getSymbolDataset()).toHaveLength(360);
      expect(isDemoDataset()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.SABIAN_DATASET_PATH;
      else process.env.SABIAN_DATASET_PATH = previous;
      __resetActiveDataset();
    }
  });

  it("fails closed when the configured path is unreadable", () => {
    const previous = process.env.SABIAN_DATASET_PATH;
    process.env.SABIAN_DATASET_PATH = "does/not/exist.json";
    __resetActiveDataset();
    try {
      expect(() => getSymbolDataset()).toThrow(/refusing to fall back/i);
    } finally {
      if (previous === undefined) delete process.env.SABIAN_DATASET_PATH;
      else process.env.SABIAN_DATASET_PATH = previous;
      __resetActiveDataset();
    }
  });

  it("changes the bounded active-dataset hash when a configured corpus changes", () => {
    const previous = process.env.SABIAN_DATASET_PATH;
    const directory = mkdtempSync(resolve(tmpdir(), "sabian-dataset-hash-"));
    const file = resolve(directory, "symbols.json");
    const first = raw360();
    writeFileSync(file, JSON.stringify(first));
    process.env.SABIAN_DATASET_PATH = file;
    __resetActiveDataset();
    try {
      const firstHash = getActiveDatasetHash();
      first[0] = { ...first[0], canonicalSymbolText: "Authorized changed wording for Aries 1" };
      writeFileSync(file, JSON.stringify(first));
      expect(getActiveDatasetHash()).not.toBe(firstHash);
    } finally {
      if (previous === undefined) delete process.env.SABIAN_DATASET_PATH;
      else process.env.SABIAN_DATASET_PATH = previous;
      __resetActiveDataset();
    }
  });
});
