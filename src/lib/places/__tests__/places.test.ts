import { describe, expect, it } from "vitest";
import {
  LocalPlaceSearchProvider,
  createPlaceSearchProvider,
  selectPlaceSearchProvider,
} from "@/lib/places/provider";
import { LivePlaceSearchProvider } from "@/lib/places/live-provider";
import { isValidTimezone, localToUtc } from "@/lib/time/birthtime";
import { PLACES } from "@/lib/places/place-index";

describe("LocalPlaceSearchProvider — Core Functionality (Task 7)", () => {
  const provider = createPlaceSearchProvider();

  it("returns exact matches first", async () => {
    const results = await provider.search("Paris");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].displayName).toBe("Paris");
  });

  it("handles case-insensitive and whitespace-padded queries", async () => {
    const upper = await provider.search("LONDON");
    const lower = await provider.search("london");
    const padded = await provider.search("   London   ");
    expect(upper.length).toBe(lower.length);
    expect(lower.length).toBe(padded.length);
    expect(upper[0].id).toBe(lower[0].id);
  });

  it("returns empty array for empty or whitespace-only queries", async () => {
    expect(await provider.search("")).toEqual([]);
    expect(await provider.search("   ")).toEqual([]);
  });

  it("retrieves a place by ID", async () => {
    const place = await provider.getById("wadowice-pl");
    expect(place).not.toBeNull();
    expect(place!.displayName).toBe("Wadowice");
    expect(place!.country).toBe("Poland");
    expect(place!.timezone).toBe("Europe/Warsaw");
  });

  it("returns null for non-existent ID", async () => {
    const place = await provider.getById("non-existent-place-id-999");
    expect(place).toBeNull();
  });

  it("respects the search result limit parameter", async () => {
    const all = await provider.search("a", 20);
    const limited = await provider.search("a", 3);
    expect(limited.length).toBeLessThanOrEqual(3);
    expect(all.length).toBeGreaterThanOrEqual(limited.length);
  });
});

describe("Location & Timezone Separate Resolution (Task 7)", () => {
  it("resolves canonical place, lat/long, and IANA timezone as separate fields for all fixture places", async () => {
    for (const place of PLACES) {
      // 1. Canonical place name fields
      expect(typeof place.displayName).toBe("string");
      expect(place.displayName.length).toBeGreaterThan(0);
      expect(typeof place.id).toBe("string");

      // 2. Lat/Long coordinates as valid numbers
      expect(typeof place.latitude).toBe("number");
      expect(typeof place.longitude).toBe("number");
      expect(place.latitude).toBeGreaterThanOrEqual(-90);
      expect(place.latitude).toBeLessThanOrEqual(90);
      expect(place.longitude).toBeGreaterThanOrEqual(-180);
      expect(place.longitude).toBeLessThanOrEqual(180);

      // 3. IANA timezone identifier
      expect(typeof place.timezone).toBe("string");
      expect(isValidTimezone(place.timezone)).toBe(true);

      // 4. Timezone resolves historical UTC offset and DST status
      const resolved = localToUtc({
        date: "1990-06-15",
        time: "12:00",
        timezone: place.timezone,
      });
      expect(typeof resolved.utcOffsetMinutes).toBe("number");
      expect(typeof resolved.offsetLabel).toBe("string");
      expect(["gap", "overlap", "unique"]).toContain(resolved.dstKind);
    }
  });
});

describe("Duplicate City Disambiguation Edge Cases (Task 7)", () => {
  const provider = createPlaceSearchProvider();

  it("disambiguates London UK vs London Ontario Canada", async () => {
    const results = await provider.search("London", 10);
    const uk = results.find((p) => p.country === "United Kingdom");
    const ca = results.find((p) => p.country === "Canada" || p.region === "Ontario");

    expect(uk).toBeDefined();
    expect(ca).toBeDefined();
    expect(uk!.timezone).toBe("Europe/London");
    expect(ca!.timezone).toBe("America/Toronto");
    expect(uk!.latitude).not.toBe(ca!.latitude);
    expect(uk!.longitude).not.toBe(ca!.longitude);
  });

  it("disambiguates Paris France vs Paris Texas USA", async () => {
    const results = await provider.search("Paris", 10);
    const fr = results.find((p) => p.country === "France");
    const us = results.find((p) => p.country === "United States" && p.region === "Texas");

    expect(fr).toBeDefined();
    expect(us).toBeDefined();
    expect(fr!.timezone).toBe("Europe/Paris");
    expect(us!.timezone).toBe("America/Chicago");
    expect(fr!.latitude).toBeCloseTo(48.8566, 2);
    expect(us!.latitude).toBeCloseTo(33.6609, 2);
  });

  it("disambiguates Cambridge UK vs Cambridge Massachusetts USA", async () => {
    const results = await provider.search("Cambridge", 10);
    const uk = results.find((p) => p.country === "United Kingdom");
    const us = results.find((p) => p.region === "Massachusetts");

    expect(uk).toBeDefined();
    expect(us).toBeDefined();
    expect(uk!.timezone).toBe("Europe/London");
    expect(us!.timezone).toBe("America/New_York");
  });

  it("disambiguates San Jose California vs San José Costa Rica", async () => {
    const caResults = await provider.search("San Jose", 10);
    const ca = caResults.find((p) => p.region === "California");
    expect(ca).toBeDefined();
    expect(ca!.timezone).toBe("America/Los_Angeles");

    const crResults = await provider.search("San José", 10);
    const cr = crResults.find((p) => p.country === "Costa Rica");
    expect(cr).toBeDefined();
    expect(cr!.timezone).toBe("America/Costa_Rica");
  });

  it("disambiguates Springfield IL vs Springfield MA", async () => {
    const results = await provider.search("Springfield", 10);
    const il = results.find((p) => p.region === "Illinois");
    const ma = results.find((p) => p.region === "Massachusetts");

    expect(il).toBeDefined();
    expect(ma).toBeDefined();
    expect(il!.timezone).toBe("America/Chicago");
    expect(ma!.timezone).toBe("America/New_York");
  });
});

describe("Historical, Renamed, and Rural Places (Task 7)", () => {
  const provider = createPlaceSearchProvider();

  it("resolves historical/renamed cities correctly", async () => {
    const stp = await provider.search("Saint Petersburg");
    expect(stp.length).toBeGreaterThan(0);
    expect(stp[0].timezone).toBe("Europe/Moscow");

    const mumbai = await provider.search("Mumbai");
    expect(mumbai.length).toBeGreaterThan(0);
    expect(mumbai[0].timezone).toBe("Asia/Kolkata");

    const hcm = await provider.search("Ho Chi Minh");
    expect(hcm.length).toBeGreaterThan(0);
    expect(hcm[0].timezone).toBe("Asia/Ho_Chi_Minh");

    const istanbul = await provider.search("Istanbul");
    expect(istanbul.length).toBeGreaterThan(0);
    expect(istanbul[0].timezone).toBe("Europe/Istanbul");
  });

  it("resolves small towns and non-major geographic locations", async () => {
    const sedona = await provider.search("Sedona");
    expect(sedona.length).toBeGreaterThan(0);
    expect(sedona[0].timezone).toBe("America/Phoenix"); // Arizona (no DST)

    const marfa = await provider.search("Marfa");
    expect(marfa.length).toBeGreaterThan(0);
    expect(marfa[0].region).toBe("Texas");

    const reine = await provider.search("Reine");
    expect(reine.length).toBeGreaterThan(0);
    expect(reine[0].country).toBe("Norway");
    expect(reine[0].latitude).toBeGreaterThan(66); // Arctic circle

    const glastonbury = await provider.search("Glastonbury");
    expect(glastonbury.length).toBeGreaterThan(0);
    expect(glastonbury[0].region).toBe("Somerset");
  });
});

describe("LivePlaceSearchProvider (Task 7)", () => {
  function fakeFetch(response: unknown, status = 200, delayMs = 0, failOnce = false) {
    let calls = 0;
    return async (url: string, init?: RequestInit) => {
      calls++;
      const signal = init?.signal;
      if (delayMs > 0) {
        await new Promise((resolve, reject) => {
          const t = setTimeout(resolve, delayMs);
          signal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      if (failOnce && calls === 1) {
        return { ok: false, status: 500, text: async () => "Internal Server Error" } as unknown as Response;
      }
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(response),
        json: async () => response,
      } as unknown as Response;
    };
  }

  it("throws a clear error when GEOCODING_API_URL is unconfigured", async () => {
    const provider = new LivePlaceSearchProvider({
      apiUrl: undefined,
    });
    await expect(provider.search("Berlin")).rejects.toThrow(/GEOCODING_API_URL/);
  });

  it("normalizes Open-Meteo format response", async () => {
    const openMeteoResponse = {
      results: [
        {
          id: 2950159,
          name: "Berlin",
          latitude: 52.52437,
          longitude: 13.41053,
          timezone: "Europe/Berlin",
          country: "Germany",
          country_code: "DE",
          admin1: "Land Berlin",
        },
      ],
    };

    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://geocoding-api.open-meteo.com/v1/search",
      fetchImpl: fakeFetch(openMeteoResponse),
    });

    const results = await provider.search("Berlin", 5);
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("Berlin");
    expect(results[0].latitude).toBe(52.52437);
    expect(results[0].longitude).toBe(13.41053);
    expect(results[0].timezone).toBe("Europe/Berlin");
    expect(results[0].country).toBe("Germany");
    expect(results[0].region).toBe("Land Berlin");
  });

  it("normalizes GeoJSON / Photon format response", async () => {
    const photonResponse = {
      features: [
        {
          geometry: {
            coordinates: [13.41053, 52.52437], // [lon, lat]
          },
          properties: {
            osm_id: 240109189,
            name: "Berlin",
            country: "Germany",
            state: "Berlin",
          },
        },
      ],
    };

    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://photon.komoot.io/api",
      fetchImpl: fakeFetch(photonResponse),
    });

    const results = await provider.search("Berlin", 5);
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("Berlin");
    expect(results[0].latitude).toBe(52.52437);
    expect(results[0].longitude).toBe(13.41053);
    expect(results[0].country).toBe("Germany");
    expect(results[0].region).toBe("Berlin");
  });

  it("passes API key in authorization headers when configured", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchImpl: (url: string, init?: RequestInit) => Promise<Response> = async (
      _url,
      init
    ) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      } as unknown as Response;
    };

    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://api.geocoding.example/search",
      apiKey: "secret-key-123",
      fetchImpl,
    });

    await provider.search("London");
    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders!["Authorization"]).toBe("Bearer secret-key-123");
    expect(capturedHeaders!["X-Api-Key"]).toBeUndefined();
  });

  it("retries once on 5xx error before failing", async () => {
    const openMeteoResponse = {
      results: [
        {
          id: 1,
          name: "Rome",
          latitude: 41.8919,
          longitude: 12.5113,
          timezone: "Europe/Rome",
          country: "Italy",
        },
      ],
    };

    const fetchImpl = fakeFetch(openMeteoResponse, 200, 0, true); // fails once
    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://geocoding-api.open-meteo.com/v1/search",
      fetchImpl,
    });

    const results = await provider.search("Rome");
    expect(results).toHaveLength(1);
    expect(results[0].displayName).toBe("Rome");
  });

  it("times out when external geocoding API exceeds timeoutMs", async () => {
    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://geocoding-api.open-meteo.com/v1/search",
      timeoutMs: 50,
      fetchImpl: fakeFetch({ results: [] }, 200, 500),
    });

    await expect(provider.search("Tokyo")).rejects.toThrow(/timed out/i);
  });

  it("throws on non-OK HTTP status from geocoding API", async () => {
    const provider = new LivePlaceSearchProvider({
      apiUrl: "https://geocoding-api.open-meteo.com/v1/search",
      fetchImpl: fakeFetch({ error: "Unauthorized" }, 401),
    });

    await expect(provider.search("Madrid")).rejects.toThrow(/HTTP 401/);
  });
});

describe("selectPlaceSearchProvider (Task 7)", () => {
  it("returns LocalPlaceSearchProvider by default", () => {
    const provider = selectPlaceSearchProvider();
    expect(provider).toBeInstanceOf(LocalPlaceSearchProvider);
  });
});
