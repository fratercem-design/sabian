import { describe, expect, it } from "vitest";
import {
  deltaT,
  greenwichApparentSiderealTime,
  localSiderealTimeDegrees,
  normalizeDegrees,
  signForLongitude,
  toDMS,
  trueObliquity,
} from "@/lib/chart/celestial";
import { sabianMappingForLongitude } from "@/lib/chart/sabian";

describe("celestial math", () => {
  it("normalizes longitudes into [0, 360)", () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(361.5)).toBe(1.5);
    expect(normalizeDegrees(-1)).toBe(359);
    expect(normalizeDegrees(720)).toBe(0);
  });

  it("maps longitudes to signs", () => {
    expect(signForLongitude(0)).toBe("Aries");
    expect(signForLongitude(29.99)).toBe("Aries");
    expect(signForLongitude(30)).toBe("Taurus");
    expect(signForLongitude(359.9)).toBe("Pisces");
  });

  it("converts decimal degrees to DMS", () => {
    expect(toDMS(14.5461)).toEqual({ degree: 14, minute: 32, second: 45 });
    expect(toDMS(0)).toEqual({ degree: 0, minute: 0, second: 0 });
    // 29°59′59″ = 29 + 59/60 + 59/3600.
    expect(toDMS(29 + 59 / 60 + 59 / 3600)).toEqual({ degree: 29, minute: 59, second: 59 });
    // 29°59′58.5″ truncates to 58 seconds.
    expect(toDMS(29 + 59 / 60 + 58.5 / 3600)).toEqual({ degree: 29, minute: 59, second: 58 });
  });

  it("computes a sane Delta T for the modern era", () => {
    const dt = deltaT(2000);
    expect(dt).toBeGreaterThan(60);
    expect(dt).toBeLessThan(66);
    const dt1950 = deltaT(1950);
    expect(dt1950).toBeGreaterThan(28);
    expect(dt1950).toBeLessThan(31);
  });

  it("computes sidereal time consistently", () => {
    const utc = new Date("1990-06-15T12:00:00Z");
    const gast = greenwichApparentSiderealTime(utc, deltaT(1990));
    expect(gast).toBeGreaterThan(0);
    expect(gast).toBeLessThan(360);
    // LST at Greenwich should equal GAST.
    expect(localSiderealTimeDegrees(utc, 0, deltaT(1990))).toBeCloseTo(gast, 4);
    // LST at 15°E should be ~1 hour (15°) ahead.
    const lst = localSiderealTimeDegrees(utc, 15, deltaT(1990));
    expect(((lst - gast + 360) % 360)).toBeCloseTo(15, 3);
  });

  it("computes true obliquity near 23.44°", () => {
    const utc = new Date("1990-06-15T12:00:00Z");
    const eps = trueObliquity(utc, deltaT(1990));
    expect(eps).toBeGreaterThan(23.4);
    expect(eps).toBeLessThan(23.47);
  });
});

describe("Sabian degree convention", () => {
  it("maps 0°00′00″ of a sign to degree 1 (leading edge)", () => {
    const m = sabianMappingForLongitude(0);
    expect(m.degree).toBe(1);
    expect(m.sign).toBe("Aries");
    expect(m.globalIndex).toBe(1);
  });

  it("maps 0°00′01″ of a sign to degree 1", () => {
    const m = sabianMappingForLongitude(1 / 3600);
    expect(m.degree).toBe(1);
    expect(m.sign).toBe("Aries");
  });

  it("maps a normal fractional position (14°32′ Aries) to Aries 15", () => {
    const m = sabianMappingForLongitude(14 + 32 / 60);
    expect(m.degree).toBe(15);
    expect(m.sign).toBe("Aries");
    expect(m.globalIndex).toBe(15);
  });

  it("maps 29°59′59″ of every sign to degree 30", () => {
    for (const signIndex of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      const lon = signIndex * 30 + 29 + 59 / 60 + 59 / 3600;
      const m = sabianMappingForLongitude(lon);
      expect(m.degree).toBe(30);
      expect(m.globalIndex).toBe(signIndex * 30 + 30);
    }
  });

  it("handles the Aries-to-Pisces global index boundary", () => {
    // 0°00′00″ Aries → global 1 (leading edge), not 360.
    expect(sabianMappingForLongitude(0).globalIndex).toBe(1);
    // 29°59′59″ Pisces → global 360.
    const last = sabianMappingForLongitude(359 + 59 / 60 + 59 / 3600);
    expect(last.globalIndex).toBe(360);
    expect(last.sign).toBe("Pisces");
    expect(last.degree).toBe(30);
    // 0°00′01″ Aries → global 1.
    expect(sabianMappingForLongitude(1 / 3600).globalIndex).toBe(1);
  });

  it("supports the trailing-edge boundary convention", () => {
    const m = sabianMappingForLongitude(0, "trailing");
    expect(m.degree).toBe(30);
    expect(m.sign).toBe("Pisces");
    expect(m.globalIndex).toBe(360);
  });
});
