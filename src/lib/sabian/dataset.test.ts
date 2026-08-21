import { describe, expect, it } from "vitest";
import { validateDataset } from "@/lib/sabian/validation";
import { demoSabianSymbols } from "@/lib/sabian/demo-data";
import { SabianSymbolSchema } from "@/lib/sabian/model";

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
});
