# ADR 0001 — Production platform and providers

- Status: implementation selected; Vercel/Prisma Blob resources provisioned for private review; live provider use and monetization remain approval-gated
- Date: 2026-09-09
- Decision owner: project owner

## Context

The application must keep chart calculation local and deterministic while allowing AI to
interpret already-validated placements. The deployment needs durable PostgreSQL storage,
durable generated-image storage, a commercial geocoder that returns IANA time zones, and a
private review surface. The existing Vercel project is `cultofpsyche/sabian`; no environment
variables or attached storage resources are currently configured.

## Decision

| Capability | Selection | Production configuration |
| --- | --- | --- |
| Astrology calculation | Local `astronomy-engine` implementation | No external call; gold-master suite remains the authority |
| AI interpretation | OpenAI Chat Completions, `gpt-5.6-terra` | Structured JSON only; chart JSON is immutable input |
| AI artwork | OpenAI Images, `gpt-image-2.5-flare`, 1024 square, medium | Sanitized symbolic prompt only |
| Generated-image storage | Public Vercel Blob | Copy provider output to a durable project asset before saving the reading |
| Geocoding | Open-Meteo commercial customer API, Standard capacity | `customer-geocoding-api.open-meteo.com`; API key as `apikey`; attribution required |
| Database | Prisma Postgres through Vercel Marketplace (currently Free plan) | Runtime and migration URLs are held in Vercel environment storage; TLS/CRUD/cleanup/backup/restore smoke remains required before production |
| Hosting | Existing Vercel project | Protected Preview for review; production stays unchanged until release approval |
| Payments | Stripe-hosted Checkout, one-time purchases for launch | Disabled until pricing, policies, webhooks, idempotency, refunds, and entitlements pass review |

## Why these choices

- Vercel is already connected to the repository and has a protected Preview deployment.
- Prisma Postgres is already provisioned and connected to the Vercel project, avoiding a second
  deployment platform. The current Free plan is not treated as proof of production backup or
  restore capability; that evidence must come from an approved disposable test.
- One OpenAI account covers text and image generation. `gpt-5.6-terra` is the balanced model
  tier; the image model is optimized for everyday generation.
- Open-Meteo returns coordinates and an IANA time zone in one response. Its free endpoint is
  non-commercial, so the paid customer endpoint is mandatory before monetization.
- Vercel Blob fixes the existing ephemeral-filesystem problem and gives every saved artwork a
  durable URL.

## Non-negotiable boundary

The AI provider never calculates longitude, houses, nodes, degrees, time-zone offsets, or
symbol numbers. `ChartCalculationProvider` produces and validates those values locally. AI
receives an immutable projection of that result and may only produce interpretation prose.
A response that does not match the Zod contract is rejected without changing the chart.

## Costs and approval boundary

Current official list prices should be rechecked immediately before activation:

- OpenAI `gpt-5.6-terra`: $2 per million input tokens and $12 per million output tokens.
- OpenAI image generation is token-metered; the selected model costs $30 per million image
  output tokens.
- Prisma Postgres pricing, quotas, and backup/restore behavior must be rechecked for the
  provisioned plan before production approval.
- Vercel Blob is usage-based after plan allowances.
- Open-Meteo requires a commercial subscription; the public page states the capacity but does
  not display a checkout price in its static content.
- Stripe standard U.S. domestic-card pricing is 2.9% + 30 cents per successful transaction.

No subscription, credential, paid resource, environment variable, or live provider call is
authorized by this ADR alone.

## Consequences

- New dependency: `@vercel/blob`.
- Live image generation must fail closed if Blob storage is selected without credentials.
- Open-Meteo credentials use the documented query parameter rather than a bearer header.
- Preview deployment tests need Vercel authentication or an automation-bypass secret.
- PostgreSQL backup/restore proof must include an exported dump and a restore into a disposable
  database or branch; point-in-time restore availability alone is not proof.

## Rollback

Set `TEXT_PROVIDER=mock`, `IMAGE_PROVIDER=mock`, remove the live geocoding URL, and keep
`TESTING_MODE_ENABLED=true`. Database rollback means direct traffic back to the known-good
PostgreSQL branch; do not fall back to serverless SQLite for real user data.

## Official references

- OpenAI models: https://developers.openai.com/api/docs/models/gpt
- OpenAI image model: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- Open-Meteo pricing: https://open-meteo.com/en/pricing
- Open-Meteo geocoding: https://open-meteo.com/en/docs/geocoding-api
- Prisma Postgres on Vercel: https://vercel.com/marketplace/prisma-postgres
- Vercel Blob pricing: https://vercel.com/docs/vercel-blob/usage-and-pricing
- Vercel deployment protection: https://vercel.com/docs/deployment-protection/methods-to-protect-deployments
- Stripe pricing: https://stripe.com/pricing
