# Entitlements and future monetization

No live billing exists in this phase. This document records the prepared structure and the
decisions required before monetization.

## Prepared structure

- `EntitlementTier`: `free` | `complete` | `art-edition` | `account`
- `getEntitlement()` (`src/lib/entitlements.ts`) computes the current entitlement from
  configuration: while `TESTING_MODE_ENABLED=true`, every feature is unlocked regardless of
  tier.
- `MONETIZATION_ENABLED=false` (the default): the application never consults a payment
  provider and remains fully usable.
- Feature mapping (planned, not enforced in testing mode):
  - **Free preview**: core placements (Sun, Moon, Asc), abbreviated interpretations.
  - **Complete reading**: full planetary chorus + complete seven-chapter story.
  - **Art edition**: high-resolution artwork + downloadable report.
  - **Account tier**: saved readings, comparison history.

No prices, checkout flows, subscriptions, or payment credentials exist.

## Decisions required before monetization

1. **Authorized Sabian dataset** — which 360-symbol dataset to license, from whom, at what
   terms; how `licensedSourceText` is delivered to the UI; attribution requirements.
2. **Live text provider** — which provider (Anthropic/OpenAI/other), which model, output
   schema versioning, cost controls, and retry/prompt-safety policy. The
   `InterpretationProvider` interface and Zod contract are ready; the live implementation
   and its tests are not.
3. **Live image provider** — which provider, image size/format, moderation policy, and the
   artwork cache/retry strategy. The `ImageGenerationProvider` interface is ready.
4. **Place search in production** — geocoding provider choice, rate limits, and the
   minimum-fields contract (only the free-text query may leave the server).
5. **PostgreSQL migration** — the `Db` interface is provider-agnostic; production will need
   the PostgreSQL implementation, migrations tooling, and connection management.
6. **Retention policy** — confirm `READING_RETENTION_DAYS`; decide whether saved readings
   (account tier) are exempt and how deletion cascades.
7. **Entitlement enforcement** — when `TESTING_MODE_ENABLED` becomes false, decide how
   tiers gate the reading sections, artwork resolution, and report downloads; and which
   payment provider / subscription model to use (no prices are invented here).
8. **Privacy review** — external-provider data-sharing documentation, DPIA if applicable,
   and the exact fields each provider receives in production.
