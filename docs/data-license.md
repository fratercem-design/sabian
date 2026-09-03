# Sabian Symbol data & licenses

## Current state: labeled demo fixture mode

The MVP ships with a **demo fixture dataset** (`src/lib/sabian/demo-data.ts`): 120 records
covering degrees 1–10 of each sign, every record with `licenseStatus: "demo-fixture"`.

- The titles are **unmistakably fictional placeholders** ("Demo image for Aries 1").
  No published or near-canonical wording is reproduced or implied — deliberately, so the
  demo dataset can never be mistaken for an authorized Sabian text set.
- No Sabian website was scraped; no book text was copied. The `licensedSourceText` field is
  empty for all demo records.
- Every record carries `sourceVersion`, `sourceAttribution`, and `licenseStatus` so the
  provenance is auditable. The provenance explicitly states the record is a fictional
  placeholder and not a Sabian symbol text.
- The UI and the reading output reference symbols generically when a record is absent
  (e.g. "Gemini 25 — an unrecorded image"), and the methodology page states that the
  complete dataset is not yet present.
- The reading page shows a "Demo symbol dataset — placeholders, not licensed Sabian
  texts" badge whenever the demo fixture dataset was used.

**This is not an authorized or canonical set of 360 symbol texts, and no claim of
originality or clearance is made.** An authorized dataset is a prerequisite for
production/commercial use.

## Data model

Every symbol record (`src/lib/sabian/model.ts`):

| Field | Purpose |
| --- | --- |
| `globalIndex` | 1–360, must equal `signIndex * 30 + degree` (validated) |
| `sign`, `degree` | Identity: sign + degree (1–30) |
| `title` | Short image title |
| `sourceVersion` | Dataset version string |
| `sourceAttribution` | Who provided/licensed the wording |
| `licenseStatus` | `public-domain-original` \| `licensed` \| `demo-fixture` \| `needs-licensed-content` |
| `licensedSourceText` | Verbatim authorized wording (kept separate from commentary) |
| `originalEditorialInterpretation` | Newly written commentary, never merged with source text |
| `keywords` | 0–6 keyword tags |
| `lightExpression` | Constructive framing |
| `shadowExpression` | Tension/awareness framing (never alarmist) |
| `reflectionQuestion` | A question for the reader |
| `visualMotifs` | Motifs used for image prompts |

## Operator-supplied dataset import

The repository includes a parser script (`scripts/parse-sabian-symbols.ts`) and an
import pipeline (`npm run import:symbols -- path/to/dataset.json`). These tools
accept an operator-supplied, licensed or public-domain 360-record dataset and
write the validated result to `src/lib/sabian/generated/full-dataset.json`
(gitignored).

Any imported dataset must be clearly licensed or demonstrably public domain
before it is activated. Until provenance is established, the active dataset
should remain the 120-record demo fixture and any candidate file should be
quarantined (for example, `data/quarantine/`) rather than deployed.

## Importing an authorized dataset

1. Produce a JSON array conforming to `SabianSymbolSchema` (see `src/lib/sabian/model.ts`).
2. Run `npm run validate:symbols -- path/to/symbols.json` — it checks:
   - exactly 360 records,
   - 360 unique sign+degree keys (duplicate detection),
   - no missing degrees,
   - global-index consistency with sign+degree,
   - a non-empty `sourceAttribution`/`sourceVersion` on every record (schema-level),
   - per-record `licenseStatus`.
3. Wire the dataset into `src/lib/sabian/index.ts` (the lookup currently used by the
   reading service), replacing the demo fixture.
4. Keep canonical/licensed wording in `licensedSourceText` and original commentary in
   `originalEditorialInterpretation` — never merge them.

## Rights and attribution expectations

- The Sabian Symbols as an organized set (1925, Elsie Wheeler / Marc Edmund Jones; later
  Dane Rudhyar's 1973 *The Astrological Mandala*) have a complex copyright history.
  Different publishers hold rights to different renderings. **Do not** transcribe books or
  websites into the dataset.
- For commercial use, license a dataset or obtain written permission from the rights
  holder, and record the license terms in `sourceAttribution` + `sourceVersion`.
- `licenseStatus: "public-domain-original"` should only be used for wording you can
  demonstrate is genuinely public domain.

## Third-party licenses in use

- astronomy-engine — MIT (Don Cross)
- moment-timezone / moment — MIT
- node:sqlite — built into Node.js
- Next.js — MIT; React — MIT; Tailwind CSS — MIT
- The demo fixture records themselves: original editorial material written for this
  project; you may use them within this project while it remains in testing phase.

## Import pipeline (Task 4)

`npm run import:symbols -- path/to/dataset.json` validates and imports an operator-supplied licensed/public-domain 360-record dataset. The import FAILS unless: exactly 360 records, 30 per sign, unique sign-degree pairs, unique global indices 1..360, no missing indices, populated provenance (sourceAttribution, sourceVersion, edition), non-demo records carry canonicalSymbolText and contain no fixture markers, and every record is explicitly `licensed` or `public-domain-original`. `needs-licensed-content` and `demo-fixture` records are rejected even when all 360 slots exist. The imported dataset lands in src/lib/sabian/generated/ (gitignored — never committed) and is revalidated at application startup before activation. Until an approved dataset is supplied, the app retains the 120 fictional placeholders and every reading is labeled incomplete demo content.
