# Verification results

All commands were run on **Windows, Node v24.18.0, npm 11.16.0** in the project root.
Dates: 2026-08-21.

## 1. Dependency installation from the committed lockfile

```bash
npm ci
```

> The lockfile (package-lock.json) is committed. The initial install was performed with
> `npm install` and the resulting lockfile is the source of truth for `npm ci`.
> **Result: passed** (440 packages installed, no audit findings reported).

## 2. Lint

```bash
npm run lint        # eslint .
```

**Result: passed** — 0 errors, 0 warnings.

## 3. Type checking

```bash
npm run typecheck   # tsc --noEmit
```

**Result: passed** — strict mode, no errors.

## 4. Unit tests

```bash
npm test            # vitest run
```

**Result: passed — 31/31 tests.**

| File | Tests | Coverage |
| --- | --- | --- |
| src/lib/chart/celestial.test.ts | 12 | longitude normalization, sign mapping, DMS, ΔT, sidereal time, obliquity, Sabian convention incl. 0°00′00″, 0°00′01″, fractional, 29°59′59″ of every sign, Aries↔Pisces boundary, trailing-edge |
| src/lib/time/birthtime.test.ts | 11 | historical offsets (London BST/GMT, Poland 1920, US DST 1987, EST), timezone validation, unknown-time midnight, reference chart (JPII) |
| src/lib/sabian/dataset.test.ts | 3 | dataset uniqueness, license labeling, global-index consistency |
| src/lib/reading/service.test.ts | 5 | full pipeline, persistence/reload, unknown-time reduction, consent refusal, deletion |

## 5. Integration tests

```bash
npm run test:integration
```

**Result: passed — 5/5** (database-backed, real SQLite file `data/sabian.test.db`).

## 6. Dataset validation

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

Explicit statement: **an authorized complete 360-symbol dataset has not been imported**.
All 120 demo records are original editorial summaries labeled `demo-fixture`; nothing was
scraped or copied. The validator itself is proven: it detects duplicates, missing degrees,
and inconsistent global indices, and would report PASS for a full authorized dataset.

## 7. Production build

```bash
npm run build       # next build
```

**Result: passed.** Routes: `/`, `/reading/new`, `/reading/[id]` (dynamic), `/about/method`,
`/privacy`, `/api/places`, `/api/readings`, `/api/readings/[id]`.

## 8. Playwright: main browser journey

```bash
npm run e2e
```

**Result: passed — 4/4 tests** (1.7 workers, Chromium):

| Test | Viewport | Result |
| --- | --- | --- |
| complete journey (11 steps) | 1440×900 | ✅ |
| landing page at 390px | 390×844 | ✅ |
| full form + reading at 390px | 390×844 | ✅ |
| unknown-time reading | 1440×900 | ✅ |

The main journey verified, in order: landing hero + badge → begin reading → multi-step form
(name/date/time/place/consent) → resolved place + timezone shown in review → generation →
reading page renders → **displayed planetary degrees match the saved calculated data**
(Gemini 24°11′ asserted against the ephemeris) → Sabian mappings displayed → story (7
chapters) and artwork render → **reload produces the identical reading** → delete removes
it and the URL returns 404.

The unknown-time journey verified: **Ascendant/Midheaven/houses are never produced**, the
Ascendant gate is replaced by an explanation, and time-independent placements remain.

## 9. Mobile 390px and desktop 1440px

Covered by the Playwright suite above (390×844 and 1440×900 projects) including a
no-horizontal-overflow assertion at 390px.

## 10. No private keys in the browser bundle

```bash
npx next build   # then scan the client bundle
```

- Environment variables are read only in server modules (`src/lib/config.ts` is imported
  only by server code; the server-side-only rule is documented and the reading-service and
  API layers are the only consumers).
- `DATABASE_URL`, provider keys, and retention settings never appear in client components.
- The client bundle scan (grep of `.next/static` for `DATABASE_URL`, `API_KEY`, `secret`)
  found **no matches**.

## 11. Fixture/demo results visibly labeled

The reading page renders "Demo interpretation — deterministic text, not AI-generated" and
"Demo artwork — deterministic emblem, not AI-generated" badges; the landing page carries
the "Testing Preview" badge; the methodology page states the dataset is a demo fixture.

## 12. Unknown-time readings never produce an Ascendant

Verified at three levels: unit tests (chart provider excludes ascendant/midheaven/houses
when `timeKnown=false`), integration test (service output), and the Playwright
unknown-time journey (UI shows "Not calculated" and an explanation).

## 13. Authorized 360-symbol dataset

**Not present** — explicitly stated in the README, docs/data-license.md, and the
validation output above. The engine and interface are complete and validated against the
demo fixture.

## What remains unproven (stated precisely)

- **Live AI interpretation** — the `InterpretationProvider` interface and Zod contract are
  implemented and tested only with the deterministic mock. A real provider call has not
  been tested.
- **Live image generation** — the `ImageGenerationProvider` interface and prompt-hash cache
  are implemented and tested only with the deterministic SVG provider.
- **Complete licensed Sabian content** — no authorized 360-entry dataset has been imported;
  the app runs in labeled demo-data mode.
- **Commercial licensing** — no licenses beyond MIT open-source dependencies are in use.
- **Production deployment** — the app was verified locally only; no hosting, TLS, backups,
  or load behavior were tested.
- **PostgreSQL** — the adapter interface is provider-agnostic, but only SQLite is
  implemented and tested.
