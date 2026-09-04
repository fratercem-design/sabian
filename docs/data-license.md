# Sabian Symbol data & licenses

## Current state: original 360-record dataset

The repository ships with an **original 360-record dataset**
(`datasets/original-sabian-symbols.json`): 360 unique records, one per zodiacal degree,
every record with `licenseStatus: "licensed"` and the project itself as the rights
holder. These phrases were written for this project in 2026, so they are the project's
own copyrighted work — `public-domain-original` is deliberately NOT used, since applying
it to original 2026 wording would read as dedicating that work to the public domain. The short symbolic phrases and
all editorial commentary were generated for this project and are **not** the historical
Sabian Symbols. No Sabian book or website was transcribed.

- The canonical wording is **original to this project**. No published or near-canonical
  Sabian wording is reproduced or implied.
- No Sabian website was scraped; no book text was copied. The `licensedSourceText` field is
  empty for all records.
- Every record carries `sourceVersion`, `sourceAttribution`, and `licenseStatus` so the
  provenance is auditable. The provenance explicitly states the wording is an original
  symbolic placeholder, not a Sabian symbol text.
- The reading page shows a "Demo symbol dataset — placeholders, not licensed Sabian
  texts" badge only when the 120-record demo fixture is active.

**This is not an authorized or canonical set of 360 symbol texts.** An authorized Sabian
dataset is a prerequisite for production/commercial use.

## How the active dataset is resolved

`src/lib/sabian/index.ts` resolves in this order, validating each candidate and
falling through on failure:

1. `SABIAN_DATASET_PATH` — an operator-supplied licensed dataset, read from disk at
   runtime so licensed corpora never enter the build artifact. A configured-but-
   unreadable path logs an error rather than failing silently.
2. The bundled `datasets/original-sabian-symbols.json`, statically imported.
3. The 120-record demo fixture.

The bundled dataset is imported statically on purpose. A path read only through
`readFileSync` is invisible to Next's file tracer, so it is not bundled into a
serverless deployment — which previously meant production silently served the demo
fixture while every local check passed.

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
write the validated result to the path configured by `SABIAN_DATASET_PATH`
(default: `src/lib/sabian/generated/full-dataset.json`, gitignored).

Any imported dataset must be clearly licensed or demonstrably public domain
before it is activated. Until provenance is established, keep the original
project-generated dataset or the 120-record demo fixture active, and quarantine
candidate files **outside the project root** (never under `data/`) so they
cannot be pulled into a deployment trace or accidentally committed. Activate a
candidate file only by setting `SABIAN_DATASET_PATH` to its absolute path after
the license/hash gate is satisfied.

## Importing an authorized dataset

1. Produce a JSON array conforming to `SabianSymbolSchema` (see `src/lib/sabian/model.ts`).
2. Run `npm run validate:symbols -- path/to/symbols.json` — it checks:
   - exactly 360 records,
   - 360 unique sign+degree keys (duplicate detection),
   - no missing degrees,
   - global-index consistency with sign+degree,
   - a non-empty `sourceAttribution`/`sourceVersion` on every record (schema-level),
   - per-record `licenseStatus`.
3. Set `SABIAN_DATASET_PATH` to the absolute path of the imported file. The
   loader in `src/lib/sabian/index.ts` reads this path at runtime and validates
   the dataset before activation.
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

`npm run import:symbols -- path/to/dataset.json` validates and imports an operator-supplied licensed/public-domain 360-record dataset. The import FAILS unless: exactly 360 records, 30 per sign, unique sign-degree pairs, unique global indices 1..360, no missing indices, populated provenance (sourceAttribution, sourceVersion, edition), non-demo records carry canonicalSymbolText and contain no fixture markers, and every record is explicitly `licensed` or `public-domain-original`. `needs-licensed-content` and `demo-fixture` records are rejected even when all 360 slots exist. The imported dataset is written to `SABIAN_DATASET_PATH` (gitignored — never committed) and is revalidated at application startup before activation. Until an approved Sabian dataset is supplied, the app retains the original project-generated 360-record dataset or the 120-record demo fixture.
