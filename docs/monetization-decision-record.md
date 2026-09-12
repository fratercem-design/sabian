# Monetization decision record — approval draft

Status: **disabled and blocked pending explicit owner approval**.

## Proposed launch offer

| Tier | Proposed price | Entitlement |
| --- | ---: | --- |
| Free Preview | $0 | Sun, Moon, Ascendant placements and abbreviated interpretation; no generated art |
| Complete Reading | $19 one time | Full planetary chorus and complete seven-chapter reading |
| Art Edition | $39 one time | Complete Reading plus four medium-resolution generated artworks and downloadable report |
| Account | Deferred | Saved-reading history and comparison tools stay out of launch until authentication and recurring-value evidence exist |

The launch recommendation is one-time purchases through Stripe-hosted Checkout. Do not introduce
a subscription until buyers demonstrate a recurring job and the account feature has retention
value. The prices above are proposals, not authorization to create products or take payment.

## Entitlement behavior required before activation

- The server, never client UI, is the authority for access.
- A successful Checkout redirect does not grant access. Only a verified, replay-safe Stripe
  webhook may create the entitlement.
- Store the Stripe event ID and reject duplicates; process events transactionally.
- Bind a one-time purchase to a single reading ID and a non-guessable receipt/access token.
- `Complete Reading` includes full prose only; it does not include generated art.
- `Art Edition` includes Complete plus four generated images and one downloadable report.
- Failed, expired, refunded, or disputed payments cannot create new paid artifacts. Refund and
  dispute revocation behavior must be tested before activation.
- Price IDs are server-side environment variables. Never trust a client-supplied amount or tier.
- `MONETIZATION_ENABLED=false` is the final kill switch and remains false during private review.

## Policy decisions required

- Terms must say the service is reflective entertainment, not medical, legal, mental-health, or
  financial advice; astrology is not represented as factual prediction.
- Privacy must identify every processor, the exact fields sent, retention periods, deletion
  process, payment metadata, and contact method.
- Purchase terms must show price, currency, delivered features, generation timing, and what
  happens if a provider fails.
- Refund policy proposal: automatic refund when no paid reading is delivered; customer-requested
  refunds reviewed within 14 days; no claim that statutory consumer rights are waived.
- Generated-image terms must disclose AI generation and any provider restrictions.
- Open-Meteo/GeoNames attribution must be visible where place data is used.
- Tax, business identity, contact address, jurisdiction, age eligibility, and accessibility
  language require owner/counsel confirmation.

## Transaction acceptance tests

- Successful payment grants exactly one matching entitlement.
- Duplicate and out-of-order webhooks remain idempotent.
- Abandoned/expired Checkout grants nothing.
- Wrong amount, currency, price ID, or metadata grants nothing.
- Refund and dispute events follow the approved revocation policy.
- Provider failure after payment results in retry or refund according to the displayed policy.
- Logs contain event IDs and internal reading IDs, never full payment credentials or birth data.
- Test-clock and Stripe test-mode flows pass before any live key is installed.

## Activation gate

Activation requires explicit approval of the prices, refund language, product descriptions,
entitlement map, tax approach, and transaction tests. Only after that approval may Stripe test
credentials be configured. Live credentials and `MONETIZATION_ENABLED=true` require a separate
production approval.
