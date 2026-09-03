import { describe, expect, it } from "vitest";
import {
  getProviderMatrix,
  getReadinessChecks,
  isSafeForPrivateBeta,
} from "@/lib/providers/status";
import { getSymbolDataset, isDemoDataset } from "@/lib/sabian";

describe("provider matrix — honest taxonomy (truth dashboard)", () => {
  it("classifies local deterministic engines as local-verified, not incomplete", () => {
    const matrix = getProviderMatrix();
    // The chart engine and IANA timezone resolver are production-grade local
    // code and must NOT be reported as demonstration blockers.
    expect(matrix.astrology.kind).toBe("local-verified");
    expect(matrix.timezone.kind).toBe("local-verified");
    expect(matrix.incomplete).not.toContain("astrology");
    expect(matrix.incomplete).not.toContain("timezone");
  });

  it("inspects the ACTIVE Sabian dataset instead of assuming the demo", () => {
    const matrix = getProviderMatrix();
    const symbols = getSymbolDataset();
    if (isDemoDataset()) {
      expect(matrix.sabian.kind).toBe("demo-fixture");
      expect(matrix.sabian.implementation).toContain(`${symbols.length}/360`);
      expect(matrix.incomplete).toContain("sabian-content");
    } else {
      expect(matrix.sabian.kind).not.toBe("demo-fixture");
      expect(matrix.incomplete).not.toContain("sabian-content");
    }
  });

  it("reports SQLite as local-verified and never exposes a connection string", () => {
    const matrix = getProviderMatrix();
    expect(matrix.database.backend).toBe("sqlite");
    expect(matrix.database.kind).toBe("local-verified");
    // No URL/credential material is present on the status object.
    expect(JSON.stringify(matrix)).not.toContain("file:");
    expect(JSON.stringify(matrix)).not.toContain("postgres://");
  });

  it("flags mock providers as demonstration blockers", () => {
    const matrix = getProviderMatrix();
    // Default configuration uses mock story + artwork.
    expect(matrix.story.kind).toBe("mock");
    expect(matrix.image.kind).toBe("mock");
    expect(matrix.incomplete).toContain("story");
    expect(matrix.incomplete).toContain("artwork");
    expect(matrix.isDemonstration).toBe(true);
  });

  it("derives the beta verdict from explicit capability checks", () => {
    const checks = getReadinessChecks();
    expect(checks.chartVerified).toBe(true);
    expect(checks.timezoneVerified).toBe(true);
    expect(checks.sabianFullyLicensed).toBe(true);
    // Story and image still use mock providers, so the beta is not yet safe.
    expect(checks.storyLiveVerified).toBe(false);
    expect(checks.imageLiveVerified).toBe(false);
    expect(checks.databaseProductionVerified).toBe(false);
    expect(isSafeForPrivateBeta()).toBe(Object.values(checks).every(Boolean));
    expect(isSafeForPrivateBeta()).toBe(false);
  });
});
