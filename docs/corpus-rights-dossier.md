# Corpus rights dossier

This is an engineering and evidence record, not legal advice. A qualified copyright lawyer
should review any claim of exclusivity or any plan to use historical Sabian wording.

## Selected corpus

The production candidate is the bundled 360-record substitute corpus at
`datasets/original-sabian-symbols.json`. It does not contain the 1953 Marc Edmund Jones book,
Dane Rudhyar's later rendering, or another scraped or licensed historical corpus.

| Evidence | Current value |
| --- | --- |
| Records | 360 |
| SHA-256 | `BDFCB51770D4B7EB9F9184FC5E2B77493F5FD94FBBC08C363A50C64368A129A7` |
| First tracked commit | `67191eae4a76a868fd9d1c8d9b2a3c519ae3b168` |
| Generator/provenance | `scripts/generate-original-sabian-dataset.ts` |
| Historical wording included | No |
| Automated validation | Passed previously; rerun with `npm run validate:symbols` |
| Human editorial review | 0/360 recorded |
| Named authorship/assignment evidence | Missing |
| Rights verdict | Blocked pending human attestation |

## Why historical public-domain wording was not selected

The symbols were conceived in 1925, but the Sabian Assembly describes the recognized book
version as first published in 1953. The current U.S. public-domain threshold does not make a
1953 publication public domain merely because the underlying session occurred earlier. The
exact original index cards, their publication status, and the relationship between later
editions would require provenance-specific legal research. No historical text is imported.

## Human-authorship issue

The repository generator mechanically combines project templates across 360 degrees. Under
current U.S. Copyright Office guidance, human-authored expression and creative selection or
arrangement may be claimable, while purely AI-generated material and mere prompting are not.
The current metadata cannot prove who wrote the templates, what AI assistance occurred, or
whether contributor rights were assigned. The internal `project-owned-original` label must not
be marketed as a verified exclusive copyright until this evidence is completed.

## Risk matrix

| Risk | Severity | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Historical text accidentally appears in the corpus | High | Low | Hash the corpus; run similarity review; never import web/book text |
| Project lacks a written assignment from a contributor | High | Medium | Obtain signed authorship/assignment record before production |
| Some generated phrases lack protectable human authorship | Medium | High | Human-edit all 360 records and preserve revision history |
| Marketing implies an authorized historical Sabian edition | High | Medium | Call it an original degree-image system; prohibit “canonical” or “authorized” claims |
| Rights manifest drifts from deployed bytes | High | Low | `npm run verify:rights` checks SHA-256 and fails closed |

## Approval procedure

1. A human editor reviews and materially approves or revises every record, then changes each
   `editorialReviewStatus` to `reviewed`.
2. Preserve the review history and identify the human authors/editors.
3. Attach a contributor authorship declaration or assignment that covers text, templates, and
   editorial revisions.
4. Update the dataset hash and review count in
   `datasets/original-sabian-symbols.rights.json`.
5. Enter a real approver and timestamp; change status to `approved`.
6. Run `npm run validate:symbols` and `npm run verify:rights`. Both must pass.
7. Have counsel review the file if the product will claim exclusive rights or historical Sabian
   compatibility.

## Legal references

- U.S. Copyright Office AI guidance: https://www.copyright.gov/ai/ai_policy_guidance.pdf
- U.S. Copyright Office AI report announcement: https://www.copyright.gov/newsnet/2025/1060.html
- Copyright duration: https://www.copyright.gov/circs/circ15a.pdf
- Copyrightable subject matter: https://www.copyright.gov/title17/92chap1.html
- Sabian Assembly history: https://sabian.org/sabian_symbols.php
