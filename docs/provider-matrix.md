# Provider Matrix — Beta Truth and Provider Readiness

Status of every provider. **Derived from actual configuration and wiring**
(`src/lib/providers/status.ts`); never aspirational and never hard-coded.

## Legend (what each status means)

- **local-verified** — deterministic, production-grade local implementation that is
  independently verified (gold-master / tests). NOT "incomplete" just because it
  is not an external service.
- **demo-fixture** — incomplete demonstration content (the 120-symbol demo dataset).
- **mock** — deterministic stand-in for a planned live service.
- **configured-untested** — live credentials/URL present, but no controlled live
  call has been verified in this environment.
- **configured-unsupported** — configuration present, but no runtime implementation
  exists yet (e.g. a PostgreSQL `DATABASE_URL`).
- **tested-live** — a controlled live call has passed verification.
- **unavailable** — required, but not configured at all.

## Matrix (default demo configuration)

| Provider | Interface | Current implementation | Kind | Env vars | Data sent externally |
| --- | --- | --- | --- | --- | --- |
| Astrology (chart) | `ChartCalculationProvider` | `AstronomyEngineChartProvider` (astronomy-engine, MIT) | local-verified | — | None — all calculation is local and deterministic |
| Geocoding | `PlaceSearchProvider` | `LocalPlaceSearchProvider` (deterministic place index) | local-verified | `GEOCODING_API_URL`, `GEOCODING_API_KEY`, `GEOCODING_PROVIDER` | None locally; a live provider sends only the free-text query |
| Historical timezone | `TimeZoneResolver` (`lib/time/birthtime.ts`) | moment-timezone with bundled IANA tz database | local-verified | — | None — IANA data is bundled locally |
| Sabian content | `SabianDataset` (`lib/sabian`) | demo fixture: **120 of 360** fictional placeholders | demo-fixture | — | None |
| Story generation | `InterpretationProvider` | `MockInterpretationProvider` (deterministic demo story) | mock | `TEXT_PROVIDER`, `TEXT_API_KEY`, `TEXT_MODEL` | None (mock); live sends validated chart JSON + symbol records |
| Image generation | `ImageGenerationProvider` | `MockImageGenerationProvider` (deterministic SVG emblem) | mock | `IMAGE_PROVIDER`, `IMAGE_API_KEY`, `IMAGE_MODEL` | None (mock); live sends a sanitized visual prompt only |
| Database | `ReadingRepository` | SQLite via node:sqlite, or PostgreSQL via bounded `pg` pool | local-verified (sqlite); configured-untested (PostgreSQL) | `DATABASE_URL`, `POSTGRES_POOL_MAX`, `POSTGRES_CONNECTION_TIMEOUT_MS` | None for SQLite; encrypted connection metadata and reading records for PostgreSQL |

## Live geocoding continuity

All three endpoints — `/api/places`, `/api/reading/review`, and reading creation —
resolve a birthplace through the **same** shared resolver (`lib/places/resolve.ts`),
which uses the **same** selected provider (`selectPlaceSearchProvider()`).

Because live geocoding APIs are search-based and expose no stable id, live results
are returned to the client as **server-signed place tokens** (HMAC-SHA256,
`lib/places/place-token.ts`). The review and creation endpoints verify the token
and recover the exact server-validated place — client-supplied coordinates and
timezones are never trusted. Local fixture results keep their stable ids and resolve
server-side via the place index. A mocked end-to-end journey test
(`src/lib/places/__tests__/live-journey.integration.test.ts`) proves search → review
→ create all agree.

## Failure / retry / timeout / rate / cost per provider

| Provider | Failure behavior | Retry | Timeout | Rate limiting | Cost-bearing |
| --- | --- | --- | --- | --- | --- |
| Astrology | Throws; reading marked failed; chart facts preserved | None needed (deterministic) | n/a | n/a | No |
| Geocoding (local) | Returns empty list for no match | None | n/a | n/a | No |
| Geocoding (live) | Throws a descriptive error; review/create resolve nothing | One retry on 5xx/network | 10s | Not yet implemented | Depends on provider |
| Timezone | Throws on unknown zone / DST gap / invalid date | None needed (deterministic) | n/a | n/a | No |
| Sabian | Missing degree falls back to "unrecorded image" placeholder text | None | n/a | n/a | No |
| Story (mock) | Always succeeds | Zod validation retries once on invalid output | n/a | n/a | No |
| Story (live) | Graceful failure; deterministic chart preserved | One retry on validation failure | Not yet implemented | Not yet implemented | Yes, once wired — per-reading token cost |
| Image (mock) | Always succeeds; SVG data URL | None | n/a | n/a | No |
| Image (live) | Failure state; single-image retry without regenerating the reading | One retry | Not yet implemented | Not yet implemented | Yes, once wired — per-image cost |

## Status logic

A reading is labeled **"Demonstration Reading"** whenever any capability that a
complete reading depends on is demo, mock, unavailable, or unverified — including
the incomplete Sabian dataset. The label is rendered from
`getProviderMatrix().isDemonstration`, which reads `env` and the active dataset at
request time; it is never hard-coded green. Local-verified chart, timezone, and
SQLite are production-grade local code and do NOT by themselves mark a reading as a
demonstration. The same matrix and the derived capability checks
(`getReadinessChecks()` / `isSafeForPrivateBeta()`) drive the development-only beta
readiness dashboard, whose test/audit counts come from a generated
`verification-manifest.json` rather than hard-coded numbers.
