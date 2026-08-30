/**
 * Live-geocoding full journey (mocked HTTP service).
 *
 * Proves the end-to-end continuity that a live birthplace search can actually
 * complete a reading: /api/places -> selection -> /api/reading/review ->
 * /api/readings, with the canonical name, coordinates, IANA timezone, resolved
 * UTC instant, and stored reading all agreeing.
 *
 * A real local HTTP server stands in for the geocoding API; GEOCODING_API_URL
 * points at it. Because config.ts parses env at import time, the env vars are
 * set in beforeAll and the route modules are imported dynamically afterwards.
 * The local fixture fallback in resolvePlace keeps this independent of any
 * leaked GEOCODING_API_URL from other suites.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";

describe("live geocoding full journey (mocked HTTP)", () => {
  let server: Server;

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          results: [
            {
              id: 2643743,
              name: "London",
              admin1: "England",
              country: "United Kingdom",
              latitude: 51.5072,
              longitude: -0.1276,
              timezone: "Europe/London",
            },
          ],
        })
      );
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    process.env.GEOCODING_API_URL = `http://127.0.0.1:${port}/geocode`;
    process.env.GEOCODING_API_KEY = "integration-test-key";
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    delete process.env.GEOCODING_API_URL;
    delete process.env.GEOCODING_API_KEY;
  });

  it("search -> signed token -> review -> create all agree", async () => {
    const { GET: placesGet } = await import("@/app/api/places/route");
    const { GET: reviewGet } = await import("@/app/api/reading/review/route");
    const { POST: readingsPost } = await import("@/app/api/readings/route");

    // 1. Search via the LIVE provider.
    const searchRes = await placesGet(
      new Request("http://localhost/api/places?q=London")
    );
    expect(searchRes.status).toBe(200);
    const { results } = (await searchRes.json()) as {
      results: Array<{ id: string; displayName: string; timezone: string; latitude: number; longitude: number }>;
    };
    expect(results).toHaveLength(1);
    const sel = results[0];
    expect(sel.displayName).toBe("London");
    expect(sel.timezone).toBe("Europe/London");
    expect(sel.latitude).toBeCloseTo(51.5072, 3);
    expect(sel.longitude).toBeCloseTo(-0.1276, 3);
    // The live result id is a signed place token, not a raw provider id.
    expect(sel.id).toContain(".");

    // 2. Review resolves the SAME server-validated place from the token.
    const reviewRes = await reviewGet(
      new Request(
        `http://localhost/api/reading/review?date=1990-06-15&time=14:30&timeKnown=true&placeId=${encodeURIComponent(sel.id)}`
      )
    );
    expect(reviewRes.status).toBe(200);
    const review = (await reviewRes.json()) as {
      place: { displayName: string; timezone: string; latitude: number; longitude: number };
      utcIso: string;
      utcOffsetMinutes: number;
    };
    expect(review.place.displayName).toBe("London");
    expect(review.place.timezone).toBe("Europe/London");
    expect(review.place.latitude).toBeCloseTo(51.5072, 3);
    expect(review.place.longitude).toBeCloseTo(-0.1276, 3);
    // 1990-06-15 14:30 in London is BST (UTC+1) -> 13:30 UTC.
    expect(review.utcOffsetMinutes).toBe(60);
    expect(review.utcIso).toBe("1990-06-15T13:30:00.000Z");

    // 3. Create the reading from the same token; stored place + chart agree.
    const createRes = await readingsPost(
      new Request("http://localhost/api/readings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Live Journey",
          birthDate: "1990-06-15",
          birthTime: "14:30",
          timeKnown: true,
          placeId: sel.id,
          consent: true,
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const { reading } = (await createRes.json()) as {
      reading: {
        id: string;
        status: string;
        place: { displayName: string; timezone: string; latitude: number; longitude: number };
        chart: { utcIso: string };
      };
    };
    expect(reading.status).toBe("ready");
    expect(reading.place.displayName).toBe("London");
    expect(reading.place.timezone).toBe("Europe/London");
    expect(reading.place.latitude).toBeCloseTo(51.5072, 3);
    expect(reading.place.longitude).toBeCloseTo(-0.1276, 3);
    // The chart was computed from the same UTC instant the review disclosed.
    expect(reading.chart.utcIso).toBe(review.utcIso);

    // 4. Clean up the stored reading so no data lingers.
    const { createReadingRepository } = await import("@/lib/db/reading-repository");
    await createReadingRepository().delete(reading.id);
  });

  it("rejects a forged place token at review", async () => {
    const { GET: reviewGet } = await import("@/app/api/reading/review/route");
    const res = await reviewGet(
      new Request(
        "http://localhost/api/reading/review?date=1990-06-15&time=14:30&timeKnown=true&placeId=forged.token"
      )
    );
    expect(res.status).toBe(400);
  });
});
