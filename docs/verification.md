# Verification results

All commands were run on **Windows, Node v24.18.0, npm 11.16.0** in the project
root, against the **isolated verification copy** (fresh `npm ci`, temporary
databases, temporary artwork caches — see below). Dates: 2026-08-21.

## Isolated environment

The final verification ran in an **isolated fresh copy**: a detached git
worktree of HEAD (`sabian-verify-copy`) with a clean `npm ci` from the
committed lockfile, then removed afterward. Every test run uses a unique
per-run temporary database and artwork cache (`vitest.tmpdir.mts` +
`vitest.setup.ts`); the Playwright dev server runs against `.e2e-tmp/`. No
command touched `data/sabian.db` or the real artwork cache in either the copy
or the main repo.

## 1. Dependency installation from the committed lockfile

```bash
npm ci
```

**Result: passed** — clean install from `package-lock.json`, 0 errors.

## 2. `npm audit`

```bash
npm audit
```

**Result: passed — 0 vulnerabilities** (full dependency tree).

## 3. `npm audit --omit=dev`

```bash
npm audit --omit=dev
```

**Result: passed — 0 vulnerabilities** (production-only).

## 4. Lint

```bash
npm run lint        # eslint .
```

**Result: passed** — 0 errors, 0 warnings.

## 5. Strict typecheck

```bash
npm run typecheck   # tsc --noEmit
```

**Result: passed** — strict mode, no errors.

## 6. Unit tests

```bash
npm test            # vitest run
```

**Result: passed — 62/62 tests** across 5 files:

| File | Tests | Coverage |
| --- | --- | --- |
| src/lib/chart/celestial.test.ts | 12 | longitude normalization, sign mapping, DMS, ΔT, sidereal time, obliquity, Sabian convention incl. 0°00′00″, 0°00′01″, fractional, 29°59′59″ of every sign, Aries↔Pisces boundary, trailing-edge |
| src/lib/chart/reference-chart.test.ts | 18 | independent reference chart (JPII): Sun, Moon, 8 planets, North Node (osculating, never descending), Ascendant, MC, house placements, numerical Placidus cusp equations, node continuity/retrograde |
| src/lib/time/birthtime.test.ts | 19 | historical offsets, calendar-date integrity (Feb 30 etc.), DST gap rejection, DST overlap with both offset choices, local-day bounds, moon-uncertainty window |
| src/lib/sabian/dataset.test.ts | 3 | demo dataset uniqueness, license labeling, global-index consistency |
| src/lib/reading/service.test.ts | 10 | full pipeline, persistence/reload, unknown-time reduction, consent refusal, deletion, opt-in save, cleanup, demo marking, chapter titles, story word count |

## 7. Integration tests (isolated SQLite)

```bash
npm run test:integration
```

**Result: passed — 10/10** (database-backed, isolated temp SQLite file).

## 8. Symbol validation

```bash
npm run validate:symbols
```

**Result: INCOMPLETE by design** — the MVP is in **labeled demo-data mode**:

```
Source:        demo fixture (src/lib/sabian/demo-data.ts)
Total records: 120
Unique:        120 / 360
Duplicates:    none
Missing:       240
Invalid:       none
Licenses:      {"demo-fixture":120}
Result:        INCOMPLETE (see above)
```

All 120 records use **unmistakably fictional placeholder titles** ("Demo image
for Aries 1"), `licenseStatus: "demo-fixture"`, empty `licensedSourceText`, and
fictional provenance fields. **No authorized 360-symbol dataset is imported.**
The validator itself is proven: it detects duplicates, missing degrees, and
inconsistent global indices, and would report PASS for a full authorized
dataset.

## 9. Production build

```bash
npm run build       # next build
```

**Result: passed.** Routes: `/`, `/reading/new`, `/reading/[id]` (dynamic),
`/about/method`, `/privacy`, `/api/places`, `/api/readings`,
`/api/readings/[id]`, `/api/reading/review`.

## 10. Full Playwright suite (390px and 1440px)

```bash
npm run e2e         # playwright test
```

**Result: passed — 13/13**:

| Test | Viewport | Result |
| --- | --- | --- |
| journey: saved-data comparison (landing → review → generation → JSON compare → reload → delete) | 1440×900 | ✅ |
| birth-time integrity: timeKnown=true without time → 400 | 1440×900 | ✅ |
| birth-time integrity: timeKnown=false with time → 400 | 1440×900 | ✅ |
| birth-time integrity: invalid date (Feb 30) → 400 | 1440×900 | ✅ |
| birth-time integrity: DST gap → 400 | 1440×900 | ✅ |
| birth-time integrity: DST overlap → both offsets (05:30Z / 06:30Z) | 1440×900 | ✅ |
| birth-time integrity: unknown time → no Asc/MC/houses in saved JSON | 1440×900 | ✅ |
| unknown-time journey: UI + saved JSON omit Asc/MC/houses | 1440×900 | ✅ |
| mobile: landing at 390px, no overflow | 390×844 | ✅ |
| mobile: full form + reading at 390px | 390×844 | ✅ |
| browser quality: no failed resources / console errors / overlays | 1440×900 | ✅ |
| browser quality: keyboard navigation + visible focus | 1440×900 | ✅ |
| browser quality: no horizontal overflow at 1440px and 390px | both | ✅ |

The journey test **fetches the saved reading JSON and compares displayed
placements (sign, DMS, Sabian degree) against it**, verifies the internal
consistency of longitude/sign/DMS/Sabian/global-index for every placement, and
asserts coordinates, timezone, historical offset, and resolved UTC appear on
the review step **before submission**.

## 11. Live browser check for failed resources, console errors, overlays, keyboard navigation, visible focus

Covered by the browser-quality spec above: zero console errors, zero failed
resources, zero React error overlays; Tab navigation reaches the primary CTA
with a non-`none` computed outline (visible focus).

## 12. Sentinel-secret scan of the client bundle

```bash
npm run scan:client-secrets
```

**Result: passed — 14 client files scanned, 0 secret patterns found.**
Environment variables are read only in server modules; the client bundle
contains no DATABASE_URL, provider keys, or secret patterns.

## 13. Unknown-time readings contain no Ascendant, Midheaven, or houses

Verified at three levels: unit tests (chart provider), integration tests
(service output), and two Playwright journeys (UI + saved JSON).

## 14. `timeKnown=true` without a time is rejected

Verified in the API spec (HTTP 400 with a `birthTime` issue) and the
unit-level schema tests.

## 15. DST gap/overlap handled explicitly

Unit tests + API spec: gap times rejected; overlap times expose both candidate
instants with a disclosed default (daylight) and an explicit standard-time
override, and the review step discloses the choice.

## 16. Story is 1,200–1,800 words

Deterministic word-count test in the service suite (1,409 words in the test
reading); the seven required chapter titles are asserted.

## 17. All mock/incomplete readings store `isDemo=true`

Service test asserts `isDemo` is derived from provider metadata (mock text,
mock artwork, or demo-fixture symbols) and persists via `providers` metadata.

## What remains unproven (stated precisely)

- **Live AI interpretation** — only the deterministic mock is tested; no real
  provider call.
- **Live image generation** — only the deterministic SVG provider is tested.
- **Complete licensed Sabian content** — the app runs in labeled demo-data
  mode (120 fictional placeholders); no authorized 360-entry dataset is
  imported.
- **Commercial licensing** — no licenses beyond MIT open-source dependencies.
- **PostgreSQL** — the adapter interface is provider-agnostic; only SQLite
  (node:sqlite via a CJS shim) is implemented and tested.
- **Production deployment** — verified locally only; no hosting, TLS, backups,
  or load behavior tested.
- **npm audit claims** — 0 vulnerabilities at time of writing for both full and
  production-only trees; this is a point-in-time result, not a guarantee.
