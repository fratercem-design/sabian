/**
 * PlaceSearchProvider — resolves a free-text birthplace query into a
 * structured PlaceResult (canonical name, coordinates, IANA time zone).
 *
 * The demo provider uses the deterministic local place index, so the product
 * works with no API key. A live provider (e.g. Open-Meteo Geocoding or
 * Photon) can be added behind the same interface without touching the rest
 * of the application; it would send ONLY the free-text query to the external
 * service.
 */

import { env } from "@/lib/config";
import type { PlaceResult } from "@/lib/types";
import { placeIndex, PLACES } from "@/lib/places/place-index";
import { LivePlaceSearchProvider } from "@/lib/places/live-provider";

export interface PlaceSearchProvider {
  search(query: string, limit?: number): Promise<PlaceResult[]>;
  getById(id: string): Promise<PlaceResult | null>;
}

function normalize(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export class LocalPlaceSearchProvider implements PlaceSearchProvider {
  async search(query: string, limit = 6): Promise<PlaceResult[]> {
    const q = normalize(query);
    if (!q) return [];
    const exact = placeIndex.filter((p) => p.displayName.toLowerCase() === q);
    const partial = placeIndex.filter(
      (p) => p.search.includes(q) && p.displayName.toLowerCase() !== q
    );
    return [...exact, ...partial].slice(0, limit).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      region: p.region,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.timezone,
    }));
  }

  async getById(id: string): Promise<PlaceResult | null> {
    const found = PLACES.find((p) => p.id === id);
    return found ?? null;
  }
}

export function createPlaceSearchProvider(): PlaceSearchProvider {
  return new LocalPlaceSearchProvider();
}

/**
 * Select the place search provider from environment configuration.
 * When GEOCODING_API_URL is configured, returns a live provider.
 * Otherwise returns the deterministic local place index (default).
 */
export function selectPlaceSearchProvider(): PlaceSearchProvider {
  if (env.GEOCODING_API_URL) {
    return new LivePlaceSearchProvider();
  }
  return new LocalPlaceSearchProvider();
}
