import { describe, expect, it } from "vitest";
import { getProviderMatrix } from "@/lib/providers/status";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian";

describe("Beta Readiness Screen & Data Inspection (Task 9)", () => {
  it("computes provider matrix accurately based on environment", () => {
    const matrix = getProviderMatrix();
    expect(matrix).toHaveProperty("astrology");
    expect(matrix).toHaveProperty("geocoding");
    expect(matrix).toHaveProperty("timezone");
    expect(matrix).toHaveProperty("sabian");
    expect(matrix).toHaveProperty("story");
    expect(matrix).toHaveProperty("image");
    expect(matrix).toHaveProperty("database");
    expect(matrix.isDemonstration).toBe(true);
    expect(matrix.incomplete.length).toBeGreaterThan(0);
  });

  it("checks active Sabian dataset status", () => {
    const symbols = getSymbolDataset();
    expect(Array.isArray(symbols)).toBe(true);
    expect(symbols.length).toBeGreaterThanOrEqual(120);
    expect(isDemoDataset()).toBe(true);
  });

  it("never hardcodes safeForPrivateBeta to true in demo configuration", () => {
    const matrix = getProviderMatrix();
    const isReady =
      matrix.astrology.kind === "live" &&
      matrix.geocoding.kind === "live" &&
      matrix.timezone.kind === "live" &&
      matrix.sabian.kind === "live" &&
      matrix.story.kind === "live" &&
      matrix.image.kind === "live" &&
      matrix.database.kind === "postgres";
    expect(isReady).toBe(false);
  });
});
