# Private deployment review

## Current observed state — 2026-09-10

- Vercel project: `cultofpsyche/sabian`
- Framework: Next.js; Node 24.x; region `iad1`
- Latest inspected preview: `sabian-bbyzzp4yr-cultofpsyche.vercel.app`
- Preview build: Ready; deployment protection is enabled
- Build: Ready; Next.js compilation and TypeScript completed successfully
- Anonymous preview request: HTTP 302 to Vercel SSO, with `X-Robots-Tag: noindex`
- Public production alias: `https://www.psychesymbols.xyz/` returns HTTP 200 with HSTS,
  CSP, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.
- Protected Preview request returns HTTP 302 to Vercel SSO with `X-Robots-Tag: noindex`.
- Vercel resource: `sabian-production`, Prisma Postgres, Free plan, connected to Preview and
  Production. The resource exists, but TLS/CRUD/cleanup and backup/restore evidence is still
  missing because the connection secret cannot be exported by the CLI.
- Vercel Blob store: `sabian-art`, public, `iad1`, active, connected to the `sabian`
  project for Preview and Production. The connection uses Vercel OIDC and provides
  `BLOB_STORE_ID`; it does not rely on a long-lived `BLOB_READ_WRITE_TOKEN`.
- A local read-only Blob SDK request was correctly denied because the local OIDC identity is
  Development-scoped and Development was deliberately not added to the connection. Blob
  read/write persistence must therefore be verified inside a new protected Preview deployment.
- Conclusion: the Vercel private-review boundary is verified; storage and database production
  gates remain open.

## Required pre-deployment evidence

- `npm run verify:full` passes on the exact source state to deploy.
- `npm audit` and `npm audit --omit=dev` report zero vulnerabilities.
- `npm run verify:rights` passes for the exact dataset hash.
- Controlled live provider smokes pass using approved credentials.
- Prisma Postgres schema plus TLS, CRUD, cleanup, dump, and disposable restore tests pass.
- `TESTING_MODE_ENABLED=true` and `MONETIZATION_ENABLED=false` remain set for private review.
- Secrets exist only in Vercel's encrypted environment-variable store.
- Vercel Blob is attached and live artwork URLs survive a new deployment.

## Private review procedure

1. Deploy a preview from an exact commit, never from an unrecorded dirty checkout.
2. Confirm anonymous access redirects to Vercel authentication.
3. Run browser tests with an approved automation-bypass secret stored outside source control.
4. Create a disposable reading and record provider provenance.
5. Verify deterministic chart values against the local gold master.
6. Refresh the reading after a redeploy and confirm text, database record, and artwork persist.
7. Delete the reading and verify database and related asset behavior matches policy.
8. Confirm `/dev/readiness` is disabled or access-controlled.
9. Inspect security headers, logs, client bundles, and provider dashboards for secret or birth-data
   leakage.

## Rollback triggers

- Any chart result differs from the deterministic gold master.
- An AI response can modify chart facts or bypass schema validation.
- Any live credential or birth datum reaches the client bundle or logs.
- Artwork disappears across deployments.
- Database restore evidence is incomplete.
- Preview is anonymously accessible.
- Corpus rights gate is not green.
- Monetization becomes enabled before its separate approval.

Rollback means stop review traffic, revert the Preview alias to the last known-good commit, rotate
any exposed credential, and restore the database from the verified recovery point when data was
affected. Production remains untouched until a separate release approval.
