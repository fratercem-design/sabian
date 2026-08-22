# Provider Matrix — Beta Truth and Provider Readiness

Status of every provider as of the Beta Truth phase. **Derived from actual
configuration and wiring** (`src/lib/providers/status.ts`); not aspirational.

Legend: **fixture** = static/local data with no live service; **mock** = deterministic stand-in for a planned live service; **live** = real external service with credentials; **unavailable** = selected but no credentials.

## Matrix

| Provider | Interface | Current implementation | Kind | Env vars | Data sent externally | Tested live |
| --- | --- | --- | --- | --- | --- | --- |
| Astrology (chart) | `ChartCalculationProvider` | `AstronomyEngineChartProvider` (astronomy-engine, MIT) | fixture | — | None — all calculation is local and deterministic | No |
| Geocoding | `PlaceSearchProvider` | `LocalPlaceSearchProvider` (static place index of 16 cities) | fixture | `GEOCODING_API_URL`, `GEOCODING_API_KEY` (accepted, not consumed) | None in fixture mode; a live provider would send only the free-text query | No |
| Historical timezone | `TimeZoneResolver` (`lib/time/birthtime.ts`) | moment-timezone with bundled IANA tz database | fixture | — | None — IANA data is bundled locally | No |
| Sabian content | `SabianDataset` (`lib/sabian`) | demo fixture: **120 of 360** fictional placeholders | fixture | — | None | No |
| Story generation | `InterpretationProvider` | `MockInterpretationProvider` (deterministic, 1,409-word demo story) | mock | `TEXT_PROVIDER`, `TEXT_API_KEY`, `TEXT_MODEL` | None (mock); live would send validated chart JSON + symbol records | No |
| Image generation | `ImageGenerationProvider` | `MockImageGenerationProvider` (deterministic SVG emblem) | mock | `IMAGE_PROVIDER`, `IMAGE_API_KEY`, `IMAGE_MODEL` | None (mock); live would send a sanitized visual prompt only — never the visitor's name or birthplace | No |
| Database | `ReadingRepository` | SQLite via node:sqlite (CJS shim), file `data/sabian.db` | fixture | `DATABASE_URL` | None — local file | No (PostgreSQL untested) |

## Failure / retry / timeout / rate / cost per provider

| Provider | Failure behavior | Retry | Timeout | Rate limiting | Cost-bearing |
| --- | --- | --- | --- | --- | --- |
| Astrology | Throws; reading marked failed; chart facts preserved | None needed (deterministic) | n/a | n/a | No |
| Geocoding (fixture) | Returns empty list for no match | None | n/a | n/a | No |
| Timezone | Throws on unknown zone / DST gap / invalid date | None needed (deterministic) | n/a | n/a | No |
| Sabian | Missing degree falls back to "unrecorded image" placeholder text | None | n/a | n/a | No |
| Story (mock) | Always succeeds | Zod validation retries once on invalid output | n/a | n/a | No |
| Story (live, planned) | Graceful failure state; deterministic chart preserved | One retry on validation failure (existing contract) | Not yet implemented | Not yet implemented | Yes, once wired — per-reading token cost |
| Image (mock) | Always succeeds; SVG data URL | None | n/a | n/a | No |
| Image (live, planned) | Failure state; single-image retry without regenerating the reading | One retry (planned) | Not yet implemented | Not yet implemented | Yes, once wired — per-image cost |

## Status logic

A reading is labeled **"Demonstration Reading"** whenever ANY provider
required for a complete reading is fixture, mock, or incomplete — including
the Sabian dataset (120/360). The label is rendered from
`getProviderMatrix().isDemonstration`, which reads `env` and the dataset
state; it is never hard-coded green. The same matrix drives the
development-only beta readiness screen.
