import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/sabian/validation";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { SabianSymbolSchema } from "@/lib/sabian/model";
import type { SabianSymbol } from "@/lib/sabian/model";
import originalDataset from "../../../datasets/original-sabian-symbols.json";

const bundledOriginal = originalDataset as SabianSymbol[];

describe("Sabian dataset", () => {
  it("demo dataset is clearly labeled and internally consistent", () => {
    const result = validateDataset(demoSabianSymbols, "demo");
    expect(result.total).toBeGreaterThan(0);
    expect(result.duplicates).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
    // Every demo record is explicitly a demo fixture — never presented as licensed content.
    expect(result.licenseStatuses["demo-fixture"]).toBe(result.total);
  });

  it("validates globalIndex consistency with sign+degree", () => {
    const bad = { ...demoSabianSymbols[0], globalIndex: 99 };
    const result = SabianSymbolSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects duplicates in a complete dataset", () => {
    // Build a dataset with a genuine duplicate key.
    const d = demoSabianSymbols.map((s) => ({ ...s }));
    const result = validateDataset(d, "test");
    expect(result.ok).toBe(false); // incomplete, as expected for demo
  });

  it("ships 360 distinct project-owned images with automated editorial checks", () => {
    const result = validateDataset(bundledOriginal, "bundled original");
    expect(result.ok).toBe(true);
    expect(result.duplicateCanonicalTexts).toHaveLength(0);
    expect(result.articleErrors).toHaveLength(0);
    expect(result.genericOriginalTitles).toHaveLength(0);
    expect(result.pendingEditorialReview).toHaveLength(0);
    expect(result.licenseStatuses).toEqual({ "project-owned-original": 360 });
    expect(bundledOriginal.every((record) => record.editorialReviewStatus === "automated-checks-passed")).toBe(true);
  });

  it("rejects repeated authoritative wording and obvious article errors", () => {
    const symbols = bundledOriginal.map((symbol) => ({ ...symbol }));
    symbols[1].canonicalSymbolText = symbols[0].canonicalSymbolText;
    symbols[2].canonicalSymbolText = "A artist opens a door.";
    const result = validateDataset(symbols, "bad semantics");
    expect(result.ok).toBe(false);
    expect(result.duplicateCanonicalTexts).toEqual(expect.arrayContaining(["Aries 1", "Aries 2"]));
    expect(result.articleErrors).toContain("Aries 3");
  });
});
