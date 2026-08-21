# The Sabian Story

> Every degree contains an image. Every life unfolds a story.

A testing-phase MVP web application that transforms a person's birth information into a
correctly calculated natal chart, a personalized Sabian Symbol analysis, original symbolic
artwork, and a custom mythic story — with a strict, auditable separation between
deterministic calculation and AI-generated interpretation.

## Status: Testing Preview

This is a **testing-phase product**. Everything runs in deterministic demo mode out of the
box: no API keys, no paid providers, no account required. Demo interpretation and demo
artwork are clearly labeled in the UI and in the data. Live AI providers and live image
generation are not yet wired for real use; the provider interfaces exist so they can be
added without changing the core architecture. **No live AI, no live image generation, no
complete licensed Sabian dataset, and no production deployment are claimed as tested in
this phase** — see [Verification](#verification) for exactly what was proven.

## Quick start

Requirements: **Node.js ≥ 22.13** (for the built-in `node:sqlite`), npm ≥ 10.

```bash
npm install          # installs from the committed package-lock.json
cp .env.example .env.local   # optional; defaults are fine for demo mode
npm run dev          # http://localhost:3000
```

Then open http://localhost:3000 and click **Begin Your Reading**.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run audit` / `npm run audit:prod` | `npm audit` (full / production-only) |
| `npm test` | Vitest unit tests (isolated temp DB + art cache) |
| `npm run test:integration` | Vitest database-backed integration tests |
| `npm run validate:symbols` | Validate the Sabian dataset (360 unique records expected) |
| `npm run cleanup:readings` | Remove readings + art cache entries older than the retention policy |
| `npm run scan:client-secrets` | Sentinel-secret scan of the client bundle |
| `npm run e2e` | Playwright browser tests (journey, DST/validation, unknown time, 390px/1440px, quality) |
| `npm run verify` | Lint + typecheck + unit + integration + dataset validation + build |
| `npm run verify:full` | `verify` + Playwright + sentinel scan |

## Configuration

All brand copy, colors, tagline, and calculation conventions are centralized in
[`src/lib/config.ts`](src/lib/config.ts) — change the name, tagline, colors, and brand copy
in one file.

Environment variables (server-side only, never in the browser):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./data/sabian.db` | SQLite path; PostgreSQL later |
| `READING_RETENTION_DAYS` | `90` | Auto-delete readings older than N days |
| `TESTING_MODE_ENABLED` | `true` | Unlock all features (no entitlements enforced) |
| `MONETIZATION_ENABLED` | `false` | Must stay `false` until a payment provider exists |
| `TEXT_PROVIDER` | `mock` | `mock` (deterministic) or a live provider name |
| `IMAGE_PROVIDER` | `mock` | `mock` (deterministic SVG) or a live provider name |
| `GEOCODING_API_URL` / `GEOCODING_API_KEY` | unset | Optional live geocoding |

See [`.env.example`](.env.example) for the full annotated template. Never commit real
credentials.

## Architecture

```
src/
  app/                  Next.js App Router pages + API routes
    api/places          Place search (deterministic local index in demo mode)
    api/readings        Create reading (POST) — body-only birth data, random IDs
    api/readings/[id]   Get (GET) / Delete (DELETE)
    reading/new         Multi-step birth-data form
    reading/[id]        The reading experience
    about/method        Methodology & trust page
    privacy             Plain-language privacy page
  components/           Accessible UI primitives + decorative visuals
  lib/
    config.ts           Brand, design tokens, conventions, env schema
    types.ts            Shared domain types (validated data shapes)
    chart/              Deterministic astronomy: ephemeris (astronomy-engine,
                        MIT), DeltaT, sidereal time, obliquity, Asc/MC,
                        documented Placidus houses, Sabian degree convention
    time/               Historical time-zone resolution (moment-timezone, IANA data)
    places/             PlaceSearchProvider (local index in demo mode)
    sabian/             Symbol schema, demo fixture dataset, validation
    interpretation/     InterpretationProvider + Zod contract
    image/              ImageGenerationProvider + shared visual style
    art/                Prompt-hash artwork cache (no duplicate generation)
    reading/            ReadingService pipeline (7 stages, retry, status)
    db/                 Db adapter (node:sqlite via a CJS shim) + ReadingRepository
scripts/                Dataset validation, retention cleanup
e2e/                    Playwright browser tests
docs/                   Architecture, calculation method, data license, entitlements
```

### Provider interfaces

The product is not hard-wired to any AI company. Each capability sits behind an interface:

- `ChartCalculationProvider` — deterministic; astronomy-engine (MIT) isolated so it can be
  replaced or commercially licensed.
- `PlaceSearchProvider` — demo: local index; live: a geocoding API behind the same interface.
- `InterpretationProvider` — demo: deterministic mock; live: an LLM selected via
  `TEXT_PROVIDER`, output validated with Zod (one retry, then graceful failure).
- `ImageGenerationProvider` — demo: deterministic SVG emblem; live: image API behind the
  same interface.
- `ReadingRepository` — SQLite now, PostgreSQL later, same interface.

### Strict separation (non-negotiable)

1. Birthplace & historical time-zone resolution (moment-timezone / IANA).
2. UTC conversion (historical offset at the place and date — never today's rules).
3. Planetary & angle calculation (astronomy-engine + documented classical formulas).
4. Sabian Symbol lookup (deterministic dataset).
5. AI interpretation (validated chart JSON only — Zod-validated output).
6. Image-prompt generation (from validated symbol data; name/birthplace never sent).
7. Image generation (server-side, cached by prompt hash).

**No AI model ever calculates a planetary position, converts a time zone, or assigns a
Sabian degree.** Every interpretation is traceable to the exact calculated placements shown
on the reading page.

### Privacy

- Guest use by default; no account required.
- Birth data goes in POST bodies only — never in URLs, analytics, or logs.
- Random, non-guessable reading IDs (`crypto.randomBytes`).
- Generated readings are NOT saved by default; saving is an explicit opt-in
  with the retention period disclosed up front.
- One-click delete on every reading; configurable retention + `npm run cleanup:readings`
  (which also removes stale failed records and old artwork cache entries).
- External providers (when enabled) receive only the minimum fields; the image provider
  never receives the person's name or raw birthplace.

### Future monetization

No live billing exists. An entitlement layer is prepared (`src/lib/entitlements.ts`):
`free` (core placements, abbreviated reading), `complete` (full analysis + story),
`art-edition` (high-res artwork + report), `account` (saved readings). All tiers are
unlocked while `TESTING_MODE_ENABLED=true` and `MONETIZATION_ENABLED=false`. No prices
are invented.

## Sabian content and rights

This MVP ships a **small, clearly labeled demo fixture dataset** (120 records,
degrees 1–10 of each sign) so the complete engine and interface can be
exercised. Every record uses an **unmistakably fictional placeholder title**
("Demo image for Aries 1") with `licenseStatus: "demo-fixture"`, empty
`licensedSourceText`, and fictional provenance — **no published or
near-canonical wording is reproduced or implied**, and nothing has been
scraped or copied. It does **not** contain an authorized set of 360 symbol
texts. Importing an authorized dataset is a prerequisite for production — see
[docs/data-license.md](docs/data-license.md) and `npm run validate:symbols`.

## Methodology

Tropical zodiac; Placidus houses (default, isolated in configuration); astronomy-engine
ephemeris (MIT); Espenak–Meeus ΔT; IANA historical time zones. The Sabian degree
convention is explicit and tested: a position within a degree maps to the **next**
numbered degree (14°32′ Aries → Aries 15), with documented boundary behavior. Unknown
birth times never produce an Ascendant, Midheaven, or houses; the Moon may be flagged as
uncertain. Full detail: [docs/calculation-method.md](docs/calculation-method.md) and the
in-app `/about/method` page.

## Verification

Everything below was run on this machine (Windows, Node v24.18.0, npm 11.16.0)
in an isolated fresh copy (clean `npm ci`, temporary databases and artwork
caches) and passed; exact commands and counts are in
[docs/verification.md](docs/verification.md).

- [x] Clean `npm ci` from the committed lockfile
- [x] `npm audit` and `npm audit --omit=dev` — 0 vulnerabilities each
- [x] Lint (ESLint, 0 errors / 0 warnings)
- [x] Strict typecheck (`tsc --noEmit`)
- [x] Unit tests (Vitest 4, 62 passed)
- [x] Integration tests (isolated SQLite, 10 passed)
- [x] Production build (`next build`)
- [x] Playwright suite (13 passed): saved-data comparison journey, DST
      gap/overlap + validation cases, unknown-time, 390px/1440px, browser
      quality (no console errors / failed resources, keyboard + focus)
- [x] Sentinel-secret scan of the client bundle (0 patterns)
- [x] Unknown-time readings never contain Ascendant/Midheaven/houses
- [x] `timeKnown=true` without a time is rejected (HTTP 400)
- [x] Story is 1,200–1,800 words (tested)
- [x] All mock/incomplete readings store `isDemo=true` (from provider metadata)
- [x] Dataset validation: 120 demo records, all fictional placeholders,
      unique, clearly labeled; authorized 360-entry dataset not yet imported
      (explicitly stated)

What remains unproven — live AI, live image generation, complete licensed
Sabian content, PostgreSQL, commercial licensing, and production deployment —
is stated precisely in docs/verification.md. **No claim of "no audit
findings" is made beyond the two point-in-time `npm audit` results above.**

## Decisions required before monetization

See [docs/entitlements.md](docs/entitlements.md) for the full list, including: which
authorized Sabian dataset to license; which live text/image providers to integrate; how
place search should work in production (geocoding provider, quotas); the PostgreSQL
migration; retention policy tuning; and payment/entitlement enforcement choices.

## License

The application code in this repository is provided for evaluation of this testing-phase
MVP. Third-party licenses: astronomy-engine (MIT), moment-timezone (MIT), node:sqlite
(built into Node.js), Next.js (MIT), React (MIT), Tailwind CSS (MIT). The demo Sabian
fixture records are original fictional placeholders written for this project (see
[docs/data-license.md](docs/data-license.md)).
