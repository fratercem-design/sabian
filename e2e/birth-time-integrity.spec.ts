import { test, expect } from "@playwright/test";

/**
 * Browser/API cases for birth-time integrity:
 *  - timeKnown=true without a birthTime must be rejected (HTTP 400)
 *  - invalid calendar dates must be rejected (HTTP 400)
 *  - DST spring-forward gap times must be rejected (HTTP 400)
 *  - DST fall-back overlap times must be handled explicitly (both choices)
 *  - unknown-time readings must contain no Ascendant/Midheaven/houses
 */

test.describe("API birth-time validation", () => {
  const base = "http://localhost:3100";

  test("timeKnown=true without birthTime is rejected with 400", async ({ request }) => {
    const res = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "No Time",
        birthDate: "1990-06-15",
        timeKnown: true,
        placeId: "london-uk",
        consent: true,
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { issues?: Array<{ path: string; message: string }> };
    expect(body.issues?.some((i) => i.path === "birthTime")).toBe(true);
  });

  test("timeKnown=false with a birthTime is rejected with 400", async ({ request }) => {
    const res = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "Contradictory",
        birthDate: "1990-06-15",
        birthTime: "14:30",
        timeKnown: false,
        placeId: "london-uk",
        consent: true,
      },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid calendar date (Feb 30) is rejected with 400", async ({ request }) => {
    const res = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "Bad Date",
        birthDate: "2024-02-30",
        birthTime: "10:00",
        timeKnown: true,
        placeId: "london-uk",
        consent: true,
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { issues?: Array<{ message: string }> };
    expect(body.issues?.some((i) => /calendar date/i.test(i.message))).toBe(true);
  });

  test("DST spring-forward gap time is rejected with 400", async ({ request }) => {
    const res = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "Gap Time",
        birthDate: "2024-03-10",
        birthTime: "02:30", // never existed in America/New_York
        timeKnown: true,
        placeId: "newyork-us",
        consent: true,
      },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/never existed/i);
  });

  test("DST fall-back overlap exposes both offset choices", async ({ request }) => {
    // 2024-11-03 01:30 occurred twice in New York.
    const daylight = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "Overlap Daylight",
        birthDate: "2024-11-03",
        birthTime: "01:30",
        timeKnown: true,
        placeId: "newyork-us",
        consent: true,
        overlapOffsetChoice: "daylight",
      },
    });
    expect(daylight.status()).toBe(201);
    const day = (await daylight.json()) as { reading: { chart: { utcIso: string } } };
    expect(day.reading.chart.utcIso).toBe("2024-11-03T05:30:00.000Z");

    const standard = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "Overlap Standard",
        birthDate: "2024-11-03",
        birthTime: "01:30",
        timeKnown: true,
        placeId: "newyork-us",
        consent: true,
        overlapOffsetChoice: "standard",
      },
    });
    expect(standard.status()).toBe(201);
    const std = (await standard.json()) as { reading: { chart: { utcIso: string } } };
    expect(std.reading.chart.utcIso).toBe("2024-11-03T06:30:00.000Z");
  });

  test("unknown-time reading contains no Ascendant, Midheaven, or houses", async ({ request }) => {
    const res = await request.post(`${base}/api/readings`, {
      data: {
        displayName: "No Time Person",
        birthDate: "1985-03-14",
        timeKnown: false,
        placeId: "newyork-us",
        consent: true,
      },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { reading: { chart: { placements: Array<{ key: string }>; houses?: unknown } } };
    const keys = body.reading.chart.placements.map((p) => p.key);
    expect(keys).not.toContain("ascendant");
    expect(keys).not.toContain("midheaven");
    expect(body.reading.chart.houses).toBeUndefined();
  });
});
