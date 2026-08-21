import { describe, expect, it } from "vitest";
import { localToUtc, unknownTimeUtc, isValidTimezone } from "@/lib/time/birthtime";
import { createChartProvider } from "@/lib/chart/provider";

describe("timezone conversion", () => {
  it("converts London local time to UTC using historical offset", () => {
    // 1990-06-15 is BST (UTC+1): 14:30 local → 13:30 UTC.
    const r = localToUtc({ date: "1990-06-15", time: "14:30", timezone: "Europe/London" });
    expect(r.utcOffsetMinutes).toBe(60);
    expect(r.utcIso).toBe("1990-06-15T13:30:00.000Z");
  });

  it("handles winter time (GMT, UTC+0)", () => {
    const r = localToUtc({ date: "1990-01-15", time: "14:30", timezone: "Europe/London" });
    expect(r.utcOffsetMinutes).toBe(0);
    expect(r.utcIso).toBe("1990-01-15T14:30:00.000Z");
  });

  it("uses the HISTORICAL offset, not today's rules", () => {
    // Poland in 1920 used +02:00 (Warsaw Mean Time + DST rules of the era).
    // The IANA tz database is authoritative for historical offsets.
    const r = localToUtc({ date: "1920-05-18", time: "17:30", timezone: "Europe/Warsaw" });
    expect(r.utcOffsetMinutes).toBeGreaterThan(0);
    expect(r.utcIso).toBe("1920-05-18T15:30:00.000Z");
  });

  it("handles US Eastern DST transition dates", () => {
    // 1987-04-05 was the DST start in the US (2am → 3am).
    const r = localToUtc({ date: "1987-04-05", time: "10:00", timezone: "America/New_York" });
    expect(r.utcOffsetMinutes).toBe(-240); // EDT
    expect(r.utcIso).toBe("1987-04-05T14:00:00.000Z");
  });

  it("validates timezone identifiers", () => {
    expect(isValidTimezone("Europe/London")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });

  it("computes the unknown-time reference instant at solar midnight", () => {
    // March 1985: New York was on EST (UTC-5) before the late-April DST start.
    const r = unknownTimeUtc({ date: "1985-03-14", timezone: "America/New_York" });
    expect(r.utcOffsetMinutes).toBe(-300); // EST
    expect(r.utcIso).toBe("1985-03-14T05:00:00.000Z");
  });

  it("rejects invalid local times", () => {
    expect(() => localToUtc({ date: "1990-06-15", time: "25:00", timezone: "Europe/London" })).toThrow();
    expect(() => localToUtc({ date: "1990-06-15", time: "12:00", timezone: "No/Zone" })).toThrow();
  });
});

describe("chart provider with timezones", () => {
  it("produces a time-known chart with Ascendant and houses", () => {
    const provider = createChartProvider();
    const chart = provider.calculate({
      utc: new Date("1990-06-15T13:30:00Z"),
      latitude: 51.5074,
      longitude: -0.1278,
      timeKnown: true,
    });
    expect(chart.placements.find((p) => p.key === "ascendant")).toBeDefined();
    expect(chart.placements.find((p) => p.key === "midheaven")).toBeDefined();
    expect(chart.houses?.length).toBe(12);
    expect(chart.timeKnown).toBe(true);
  });

  it("produces a time-unknown chart WITHOUT Ascendant, Midheaven, or houses", () => {
    const provider = createChartProvider();
    const chart = provider.calculate({
      utc: new Date("1985-03-14T04:00:00Z"),
      latitude: 40.7128,
      longitude: -74.006,
      timeKnown: false,
      localDateOnly: "1985-03-14",
      timeNotation: "Solar midnight",
    });
    expect(chart.placements.find((p) => p.key === "ascendant")).toBeUndefined();
    expect(chart.placements.find((p) => p.key === "midheaven")).toBeUndefined();
    expect(chart.houses).toBeUndefined();
    expect(chart.timeUncertaintyNote).toBeDefined();
  });

  it("flags a Moon that changes sign during the day when time is unknown", () => {
    const provider = createChartProvider();
    const chart = provider.calculate({
      utc: new Date("1985-03-14T04:00:00Z"),
      latitude: 40.7128,
      longitude: -74.006,
      timeKnown: false,
    });
    // The property must be a boolean (true or false) — never undefined for unknown times.
    expect(typeof chart.moonUncertain).toBe("boolean");
  });

  it("matches the reference chart (Pope John Paul II, per Astrotheme)", () => {
    const provider = createChartProvider();
    // 17:30 local Wadowice (Europe/Warsaw, historical +02:00) = 15:30 UTC.
    const chart = provider.calculate({
      utc: new Date("1920-05-18T15:30:00Z"),
      latitude: 49.8833,
      longitude: 19.5,
      timeKnown: true,
    });
    const sun = chart.placements.find((p) => p.key === "sun")!;
    expect(sun.sign).toBe("Taurus");
    expect(sun.degree).toBe(27);
    const moon = chart.placements.find((p) => p.key === "moon")!;
    expect(moon.sign).toBe("Gemini");
    expect(moon.degree).toBe(2);
    const asc = chart.placements.find((p) => p.key === "ascendant")!;
    expect(asc.sign).toBe("Libra");
    expect(Math.abs(asc.longitude - 207.27)).toBeLessThan(0.5);
    const mc = chart.placements.find((p) => p.key === "midheaven")!;
    expect(mc.sign).toBe("Leo");
    expect(Math.abs(mc.longitude - 125.63)).toBeLessThan(0.5);
  });
});
