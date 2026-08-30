# Architecture

This document describes the architecture of The Sabian Story testing-phase MVP: the strict
separation of concerns, the provider interfaces, the data flow of a reading, and the
privacy/monetization groundwork.

## Layered design

```
┌──────────────────────────────────────────────────────────────┐
│ Browser (Next.js App Router)                                  │
│  Landing · Form · Reading · Method · Privacy                   │
└──────────────────────────────┬───────────────────────────────┘
                               │ fetch (JSON, body-only birth data)
┌──────────────────────────────▼───────────────────────────────┐
│ API routes (server)                                          │
│  /api/places · /api/readings · /api/readings/[id]             │
└──────────────────────────────┬───────────────────────────────┘
┌──────────────────────────────▼───────────────────────────────┐
│ ReadingService (pipeline orchestration, 7 stages, retries)   │
├───────────────┬───────────────┬───────────────┬──────────────┤
│ PlaceSearch   │ ChartCalc     │ Interpretation│ ImageGen     │
│ Provider      │ Provider      │ Provider      │ Provider     │
│ (interface)   │ (interface)   │ (interface)   │ (interface)  │
│  └ local index│  └ astronomy- │  └ mock (demo)│  └ mock SVG  │
│                │    engine     │  └ live (env) │  └ live (env)│
├───────────────┴───────────────┴───────────────┴──────────────┤
│ ReadingRepository → node:sqlite | pg connection pool      │
└──────────────────────────────────────────────────────────────┘
```

## The seven stages of a reading

1. **Resolving birthplace** — `PlaceSearchProvider.search()`/`getById()`. Demo mode uses a
   deterministic local index of real cities + fictional test identities. A live provider
   would receive only the free-text query.
2. **Converting historical time** — `localToUtc()` uses moment-timezone with the full IANA
   database: the UTC offset that *actually applied* at the birthplace on the birth date
   (LMT, DST transitions, zone redefinitions included). Never today's rules. Unknown-time
   readings use solar midnight of the local calendar date as a **disclosed reference
   instant** — never presented as the real birth time.
3. **Calculating the natal chart** — `ChartCalculationProvider.calculate()`:
   - Sun, Moon, Mercury…Pluto: astronomy-engine (VSOP87-based geocentric, true-of-date).
   - North Node: from astronomy-engine's lunar node event search.
   - Ascendant/Midheaven: computed only when the time is known (horizon scan + meridian
     formula); houses via the documented Placidus semi-arc solver in `houses.ts`.
   - All longitudes normalized to [0, 360); DMS + sign + Sabian degree + global index per
     placement.
4. **Finding the relevant Sabian Symbols** — deterministic lookup in the symbol dataset by
   global index.
5. **Composing the interpretation** — `InterpretationProvider.generate()` receives the
   validated `InterpretationInput` (placements + symbols). Output is validated against the
   Zod `InterpretationSchema`; on failure it is retried once, then the reading fails
   gracefully with the deterministic chart preserved.
6. **Creating symbolic artwork** — `ImageGenerationProvider.generate()` per Sun/Moon/
   Ascendant (or a combined Sun+Moon image when the Ascendant is unavailable). Prompts are
   built from the symbol + the shared visual style; the person's name and birthplace are
   never sent to an image provider. Artwork is cached by `sha256(prompt + provider)` so a
   refresh never duplicates generation.
7. **Weaving the personal story** — the story is part of the validated interpretation
   output (7 chapters).

## Deterministic vs. interpretive (the hard line)

- **Deterministic:** place resolution, UTC conversion, planetary longitudes, Asc/MC,
  houses, Sabian degree assignment, symbol lookup. No AI, ever.
- **Interpretive:** prose, story chapters, prompts, artwork. AI (or the mock) sees only the
  validated chart JSON and symbol records, and its output is schema-validated before it
  reaches the database or UI.
- The reading page shows the exact calculated position and the resulting Sabian degree
  together, and every gate panel carries a disclosure separating calculated facts from
  generated reflection.

## Data model

- `Placement` — longitude, sign, DMS within sign, sabianDegree (1–30), globalIndex (1–360).
- `ChartData` — placements, houses (time-known only), ephemeris config, uncertainty notes.
- `ReadingInterpretation` — the Zod-validated interpretation object.
- `Reading` — the persisted aggregate (birth record + chart + interpretation + artwork).

## Persistence

- `ReadingRepository`: SQLite via `node:sqlite` locally and PostgreSQL via a bounded
  `pg` connection pool. `DATABASE_URL` selects the backend. PostgreSQL values are
  parameterized; schema provisioning and a controlled live smoke test remain operator gates.
- `ReadingRepository`: create/update/get/delete/cleanup. Random non-guessable IDs,
  explicit delete, configurable retention (`READING_RETENTION_DAYS`,
  `npm run cleanup:readings`).

## Privacy architecture

- Birth data: POST body only, never URLs; no analytics; no logs; minimal retention.
- Random IDs; saved readings are opt-in (generation itself is the opt-in); delete is
  one-click.
- External providers (future): minimum fields; image provider never receives name or raw
  birthplace.

## Monetization groundwork

- `EntitlementTier` type + `getEntitlement()` in `src/lib/entitlements.ts`.
- Feature flags map tiers to features; `TESTING_MODE_ENABLED=true` unlocks everything;
  `MONETIZATION_ENABLED=false` means no payment provider is consulted.
- No prices, no checkout, no subscriptions exist in this phase.

## Testing strategy

- **Unit (Vitest):** celestial math, Sabian degree boundaries, time-zone conversions,
  chart vs. reference charts, dataset validation.
- **Integration (Vitest):** full service pipeline against a real SQLite file — creation,
  reload consistency, unknown-time behavior, consent refusal, deletion.
- **E2E (Playwright):** the complete browser journey (landing → form → generation →
  verification of displayed degrees/Sabian mappings → reload → delete), unknown-time
  journey, and 390px/1440px viewport checks.
