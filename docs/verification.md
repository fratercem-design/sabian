# Verification results

Commands were run on **Windows, Node v24.18.0**. Verification covers the repaired
project-owned 360-image dataset and the exact active-text reading path. Date:
2026-09-03.

## Isolated environment

The dependency baseline ran in an isolated copy with `npm ci`. The final
`npm run verify:manifest` records the exact dirty-worktree fingerprint and a
separate bounded hash of the active symbol dataset. Every test uses a per-run temporary database and artwork
cache (`vitest.tmpdir.mts` + `vitest.setup.ts`); the Playwright server uses
`.e2e-tmp/`. No verification command touched `data/sabian.db` or the real
artwork cache.

## 1. Dependency installation from the committed lockfile

```bash
npm ci
```

**Result: passed** — clean install from `package-lock.json`, 0 errors.

## 2. `npm audit`

```bash
npm audit
```

**Result: unavailable** — the npm security endpoint timed out during this run.
No current vulnerability count can be inferred from that failure.

## 3. `npm audit --omit=dev`

```bash
npm audit --omit=dev
```

**Result: unavailable** — the npm security endpoint timed out during this run.

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

**Result: passed — 216/216 tests** across 16 files. Coverage includes longitude
and Sabian boundaries, Swiss-Ephemeris gold masters, North Node convention,
DST gap/overlap handling, licensed-dataset rejection gates, live-provider
contracts, signed place tokens, production configuration failure, readiness
truthfulness, and parameterized PostgreSQL repository behavior.

## 7. Integration tests (isolated SQLite)

```bash
npm run test:integration
```

**Result: passed — 12/12** across 2 files (database-backed service flow plus
live-geocoding search → signed token → review → create), using isolated temp SQLite.

## 8. Symbol validation

```bash
npm run validate:symbols
```

**Result: passed** — the bundled project-owned original dataset is complete and
passes structural and semantic content gates:

```
Source:        datasets/original-sabian-symbols.json
Total records: 360
Unique:        360 / 360
Duplicates:    none
Missing:       0
Invalid:       none
Licenses:      {"project-owned-original":360}
Rights gaps:   0
Unique texts:  360 / 360
Article errors:  0
Generic titles:  0
Review pending:  0
Result:        PASS — 360 structurally and semantically distinct records
```

All 360 records use project-owned original wording and descriptive titles;
`licensedSourceText` stays empty because the active content is original rather
than copied from a third-party corpus. The validator rejects repeated images,
obvious A/An errors, generic titles, pending review status, duplicates, missing
degrees, unresolved rights status, and inconsistent global indices.

The generated corpus records `automated-checks-passed`, not human editorial
approval. These checks establish distinct text and basic grammar; they do not
prove that every image has a distinct psychological meaning or finished literary quality.

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
the review step **before submission**. It also asserts that the exact
`canonicalSymbolText` selected for the Sun is visible in the rendered reading.

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
- **Optional historical Sabian wording** — the active 360-image corpus is
  project-owned original material. No historical third-party rendering has
  been activated or tested.
- **PostgreSQL** — the runtime repository and migration path are implemented
  with parameterized SQL and local contract tests, but no real PostgreSQL
  schema, TLS connection, CRUD/cleanup smoke test, backup, or restore has been exercised.
- **Production deployment** — verified locally only; no hosting, TLS, backups,
  or load behavior tested.
- **npm audit claims** — current full and production-only counts are unavailable
  because the registry security endpoint timed out. Earlier zero-count audits do
  not certify the current run.
