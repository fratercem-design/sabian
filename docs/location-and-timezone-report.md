# Location and Timezone Services Report (Task 7)

## Executive Summary

This report assesses the location resolution, geocoding, and timezone calculation architecture for **The Sabian Story**.

| Capability | Status | Provider / Implementation | External Data Sent |
| :--- | :--- | :--- | :--- |
| **Place Search (Geocoding)** | **Fixture-based (Default)** | `LocalPlaceSearchProvider` (curated index of 30+ locations) | None |
| **Live Geocoding Adapter** | **Ready (Unwired)** | `LivePlaceSearchProvider` (`GEOCODING_API_URL`) | Free-text query only |
| **Timezone Resolution** | **Live** | `moment-timezone` with bundled IANA tz database | None (local evaluation) |
| **Historical UTC Offset** | **Live** | Evaluated for exact historical date & time | None |
| **DST Gap / Overlap Integrity** | **Live** | `classifyLocalTime()` in `src/lib/time/birthtime.ts` | None |

---

## 1. Separate Resolution Verification

The architecture strictly enforces separation between all location and time dimensions. Each dimension is resolved as an explicit, distinct property:

```typescript
export interface PlaceResult {
  id: string;               // Unique place identifier
  displayName: string;      // Canonical place name (e.g., "Paris", "London")
  region?: string;          // State / province / county (e.g., "Texas", "Île-de-France")
  country?: string;         // Sovereign nation (e.g., "United States", "France")
  latitude: number;         // Float in [-90, +90]
  longitude: number;        // Float in [-180, +180]
  timezone: string;         // IANA zone identifier (e.g., "America/Chicago", "Europe/Paris")
}

export interface ResolvedTime {
  utcIso: string;           // Exact ISO-8601 UTC instant
  utcOffsetMinutes: number; // Historical offset in minutes at that place & moment
  offsetLabel: string;      // Human-readable string, e.g. "+02:00"
  timezone: string;         // IANA timezone identifier
  zoneKnown: boolean;       // Whether database has entry
  dstKind: "gap" | "overlap" | "unique"; // DST classification
  overlapChoices?: Array<{  // Ambiguity choices for fall-back overlaps
    utcIso: string;
    utcOffsetMinutes: number;
    offsetLabel: string;
    label: string;
  }>;
  overlapChosenLabel?: string;
}
```

Every property is independently validated:
- Coordinates are never guessed or rounded to integer degrees.
- Timezone is strictly validated via `moment.tz.zone(timezone) !== null`.
- UTC conversion accounts for historical daylight-saving time rules, local mean time (LMT), and territorial changes encoded in IANA zone files.

---

## 2. Edge Case Verification & Testing

Comprehensive automated tests in `src/lib/places/__tests__/places.test.ts` (22 tests) and `src/lib/time/birthtime.test.ts` (19 tests) verify critical edge cases:

### A. Duplicate City Names Across Different Countries & States
- **London**: Disambiguated between London, England, UK (`Europe/London`, lat 51.5074) and London, Ontario, Canada (`America/Toronto`, lat 42.9849).
- **Paris**: Disambiguated between Paris, France (`Europe/Paris`, lat 48.8566) and Paris, Texas, USA (`America/Chicago`, lat 33.6609).
- **Cambridge**: Disambiguated between Cambridge, UK (`Europe/London`) and Cambridge, Massachusetts (`America/New_York`).
- **San Jose**: Disambiguated between San Jose, California (`America/Los_Angeles`) and San José, Costa Rica (`America/Costa_Rica`).
- **Springfield**: Disambiguated between Springfield, Illinois (`America/Chicago`) and Springfield, Massachusetts (`America/New_York`).

### B. Historical and Renamed Locations
- **Saint Petersburg** (formerly Petrograd / Leningrad): Mapped to `Europe/Moscow` with canonical coordinates.
- **Mumbai** (formerly Bombay): Mapped to `Asia/Kolkata` with historical IST offset.
- **Ho Chi Minh City** (formerly Saigon): Mapped to `Asia/Ho_Chi_Minh`.
- **Istanbul** (formerly Constantinople): Mapped to `Europe/Istanbul`.

### C. Small Towns & Non-Major Locations
- **Wadowice** (Poland): Small historic town (birthplace of Pope John Paul II), tested with historical 1920 offset.
- **Sedona** (Arizona): Tested for `America/Phoenix` (permanent Mountain Standard Time, no DST).
- **Reine** (Norway): High-latitude Arctic circle location (lat 67.93°N).
- **Marfa** (Texas) & **Glastonbury** (Somerset, UK): Regional rural towns.

### D. DST Ambiguity & Invalid Times
- **Spring-Forward Gaps** (e.g., 1987-04-05 02:30 in New York): Identified as non-existent local time and rejected with clear user error.
- **Fall-Back Overlaps** (e.g., 1987-10-25 01:30 in New York): Identified as ambiguous; returns daylight-saving occurrence first by default with both options exposed in `overlapChoices`.

---

## 3. Coverage Evaluation & Beta Recommendations

### Current Demonstration Coverage (Static Place Index)
- **Strengths**: 100% deterministic, zero network dependencies, zero privacy leakage, covers key world capitals and all test suites.
- **Limitation**: Only contains ~30 pre-indexed cities. Real users born in unlisted cities or small towns cannot find their birthplace in pure fixture mode.

### Requirement for Closed Beta
For a closed beta with real users outside the curated test cities:
1. **Live Geocoding Provider**: Configure `GEOCODING_API_URL` (e.g., Open-Meteo Geocoding API at `https://geocoding-api.open-meteo.com/v1/search` or a private Photon/Nominatim instance).
2. **Privacy Assurance**: The `LivePlaceSearchProvider` ensures only the raw search query string is transmitted to the external geocoder. No personal identifiers (name, birth date, birth time) ever leave the application.
3. **Fallback Strategy**: If the live geocoder is unreachable or times out (10s limit), the system can fall back to the static local index.
