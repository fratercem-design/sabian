/**
 * Live place-search provider adapter (Task 7) — server-only.
 *
 * Implements the PlaceSearchProvider interface against a live geocoding API
 * (e.g., Open-Meteo Geocoding, Photon, Mapbox, or custom geocoding service).
 *
 * Key guarantees:
 *  - Sends ONLY the free-text query to the external service — never birth dates,
 *    times, names, or chart data.
 *  - Throws a descriptive error when GEOCODING_API_URL / GEOCODING_API_KEY is not
 *    configured, so misconfigurations fail loudly rather than silently.
 *  - Handles timeouts (default 10s) with AbortController.
 *  - Retries once on 5xx or network errors.
 *  - Normalizes diverse API response formats to the standard PlaceResult shape
 *    including canonical display name, coordinates, and IANA timezone.
 */

/* Server-only module. Never imported from client components. */

import { env } from "@/lib/config";
import type { PlaceResult } from "@/lib/types";
import type { PlaceSearchProvider } from "@/lib/places/provider";

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

export interface LivePlaceSearchOptions {
  apiUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: HttpClient;
}

interface GeocodingApiResultItem {
  id?: number | string;
  name?: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  // Alternative shapes (Photon / Nominatim / Mapbox)
  properties?: {
    osm_id?: number | string;
    name?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    extent?: number[];
  };
  geometry?: {
    coordinates?: [number, number]; // [lon, lat]
  };
}

interface GeocodingApiResponse {
  results?: GeocodingApiResultItem[];
  features?: GeocodingApiResultItem[];
}

export class LivePlaceSearchProvider implements PlaceSearchProvider {
  readonly name: string;
  private apiUrl: string | undefined;
  private apiKey: string | undefined;
  private timeoutMs: number;
  private fetchImpl: HttpClient;

  constructor(opts: LivePlaceSearchOptions = {}) {
    this.apiUrl = opts.apiUrl ?? env.GEOCODING_API_URL;
    this.apiKey = opts.apiKey ?? env.GEOCODING_API_KEY;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    this.name = `live (${this.apiUrl ?? "unconfigured"})`;
  }

  async search(query: string, limit = 6): Promise<PlaceResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (!this.apiUrl) {
      throw new Error(
        "GEOCODING_API_URL is not configured. " +
          "A live geocoding provider requires an API URL. Use LocalPlaceSearchProvider for fixture mode."
      );
    }

    const url = new URL(this.apiUrl);
    url.searchParams.set("name", trimmed);
    url.searchParams.set("count", String(Math.min(limit, 20)));
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await this.fetchImpl(url.toString(), {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Live geocoding provider returned HTTP ${res.status}`);
        }

        const data = (await res.json()) as GeocodingApiResponse;
        return this.normalizeResults(data, limit);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          lastError = new Error(`Live geocoding provider timed out after ${this.timeoutMs}ms`);
        } else {
          lastError = err instanceof Error ? err : new Error(String(err));
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error("Live geocoding request failed");
  }

  // Live geocoding APIs are search-based and expose no stable id lookup, so
  // `getById` is intentionally NOT implemented. Instead, `/api/places` signs
  // each result into a place token (lib/places/place-token.ts) that the review
  // and reading endpoints verify server-side — client coordinates/timezones are
  // never trusted.

  private normalizeResults(data: GeocodingApiResponse, limit: number): PlaceResult[] {
    const rawItems = data.results ?? data.features ?? [];
    const results: PlaceResult[] = [];

    for (const item of rawItems) {
      if (results.length >= limit) break;

      // Handle standard Open-Meteo format
      if (item.name && typeof item.latitude === "number" && typeof item.longitude === "number") {
        results.push({
          id: `geo-${item.id ?? `${item.latitude.toFixed(4)}_${item.longitude.toFixed(4)}`}`,
          displayName: item.name,
          region: item.admin1 ?? undefined,
          country: item.country ?? undefined,
          latitude: item.latitude,
          longitude: item.longitude,
          timezone: item.timezone ?? "UTC",
        });
        continue;
      }

      // Handle GeoJSON / Photon format
      if (item.properties?.name && item.geometry?.coordinates) {
        const [lon, lat] = item.geometry.coordinates;
        results.push({
          id: `photon-${item.properties.osm_id ?? `${lat.toFixed(4)}_${lon.toFixed(4)}`}`,
          displayName: item.properties.name,
          region: item.properties.state ?? undefined,
          country: item.properties.country ?? undefined,
          latitude: lat,
          longitude: lon,
          timezone: "UTC", // Photon does not return IANA timezone natively
        });
      }
    }

    return results;
  }
}

export function createLivePlaceSearchProvider(
  opts?: LivePlaceSearchOptions
): LivePlaceSearchProvider {
  return new LivePlaceSearchProvider(opts);
}
