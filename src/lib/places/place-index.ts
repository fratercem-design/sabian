/**
 * Deterministic local place index — the demo PlaceSearchProvider dataset.
 *
 * Contains real cities with real coordinates and IANA time zones (so the
 * historical-offset machinery is exercised with correct data), plus the
 * fictional test identities used by the automated tests. No external
 * geocoding service is required in demo mode.
 */

import type { PlaceResult } from "@/lib/types";

export const PLACES: PlaceResult[] = [
  {
    id: "wadowice-pl",
    displayName: "Wadowice",
    region: "Lesser Poland",
    country: "Poland",
    latitude: 49.8833,
    longitude: 19.5,
    timezone: "Europe/Warsaw",
  },
  {
    id: "london-uk",
    displayName: "London",
    region: "England",
    country: "United Kingdom",
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: "Europe/London",
  },
  {
    id: "newyork-us",
    displayName: "New York City",
    region: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
  {
    id: "losangeles-us",
    displayName: "Los Angeles",
    region: "California",
    country: "United States",
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: "America/Los_Angeles",
  },
  {
    id: "paris-fr",
    displayName: "Paris",
    region: "Île-de-France",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: "Europe/Paris",
  },
  {
    id: "tokyo-jp",
    displayName: "Tokyo",
    region: "Tokyo Metropolis",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  {
    id: "sydney-au",
    displayName: "Sydney",
    region: "New South Wales",
    country: "Australia",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
  },
  {
    id: "moscow-ru",
    displayName: "Moscow",
    region: "Moscow",
    country: "Russia",
    latitude: 55.7558,
    longitude: 37.6173,
    timezone: "Europe/Moscow",
  },
  {
    id: "delhi-in",
    displayName: "New Delhi",
    region: "Delhi",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  {
    id: "santabarbara-us",
    displayName: "Santa Barbara",
    region: "California",
    country: "United States",
    latitude: 34.4208,
    longitude: -119.6982,
    timezone: "America/Los_Angeles",
  },
  {
    id: "valletta-mt",
    displayName: "Valletta",
    region: "Malta Island",
    country: "Malta",
    latitude: 35.8989,
    longitude: 14.5146,
    timezone: "Europe/Malta",
  },
  {
    id: "havana-cu",
    displayName: "Havana",
    region: "La Habana",
    country: "Cuba",
    latitude: 23.1136,
    longitude: -82.3666,
    timezone: "America/Havana",
  },
  {
    id: "reykjavik-is",
    displayName: "Reykjavík",
    region: "Capital Region",
    country: "Iceland",
    latitude: 64.1466,
    longitude: -21.9426,
    timezone: "Atlantic/Reykjavik",
  },
  {
    id: "auckland-nz",
    displayName: "Auckland",
    region: "Auckland Region",
    country: "New Zealand",
    latitude: -36.8485,
    longitude: 174.7633,
    timezone: "Pacific/Auckland",
  },
  {
    id: "testvale-fict",
    displayName: "Testvale",
    region: "Fictional County",
    country: "Fiction",
    latitude: 51.2,
    longitude: -0.5,
    timezone: "Europe/London",
  },
  {
    id: "fictionalia-fict",
    displayName: "Fictionalia",
    region: "Fictional County",
    country: "Fiction",
    latitude: 49.85,
    longitude: 19.5,
    timezone: "Europe/Warsaw",
  },
];

/** Build the searchable index once at module load. */
import { indexPlaces } from "@/lib/time/birthtime";

export const placeIndex = indexPlaces(PLACES);
