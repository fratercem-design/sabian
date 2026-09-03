# Production Database Migration Plan: SQLite to PostgreSQL (Task 8)

## 1. Overview & Architecture

The Sabian Story currently uses local SQLite via `node:sqlite` for fast, zero-dependency development and testing. This plan outlines the technical migration to production PostgreSQL without introducing live database credentials or modifying the testing-phase safety constraints.

The database interface `Db` in `src/lib/db/adapter.ts` and repository `ReadingRepository` in `src/lib/db/reading-repository.ts` are already designed with strict provider-agnostic abstractions.

---

## 2. Exact Schema Mapping

| Field | SQLite Type | PostgreSQL Type | Nullable | Constraints & Defaults | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `VARCHAR(64)` | No | `PRIMARY KEY` | 12–16 byte random `base64url` |
| `created_at` | `TEXT` | `TIMESTAMPTZ` | No | `DEFAULT NOW()` | ISO-8601 UTC timestamp |
| `updated_at` | — | `TIMESTAMPTZ` | No | `DEFAULT NOW()` | Maintained via database trigger |
| `display_name` | `TEXT` | `VARCHAR(120)` | No | — | Visitor chosen name/nickname |
| `birth_date` | `TEXT` | `DATE` | No | — | Calendar date `YYYY-MM-DD` |
| `birth_time` | `TEXT` | `VARCHAR(10)` | Yes | `NULL` | Wall-clock `HH:mm` (null if unknown) |
| `time_known` | `INTEGER` | `BOOLEAN` | No | `DEFAULT TRUE` | Whether birth time was exact |
| `time_notation`| `TEXT` | `VARCHAR(255)` | Yes | `NULL` | Disclosed reference instant label |
| `place_id` | `TEXT` | `VARCHAR(100)` | No | — | Place identifier |
| `place_json` | `TEXT` | `JSONB` | No | — | Canonical place name, region, coords, tz |
| `chart_json` | `TEXT` | `JSONB` | No | — | Exact calculated longitudes, houses |
| `interpretation_json` | `TEXT` | `JSONB` | Yes | `NULL` | Zod-validated 7-chapter story & gates |
| `artwork_json` | `TEXT` | `JSONB` | Yes | `NULL` | Generated artwork metadata & prompts |
| `providers_json` | `TEXT` | `JSONB` | No | `DEFAULT '{}'::jsonb` | Active providers & model IDs used |
| `status` | `TEXT` | `VARCHAR(30)` | No | `DEFAULT 'pending'` | `pending`, `generating`, `ready`, `failed` |
| `error` | `TEXT` | `TEXT` | Yes | `NULL` | Error details on generation failure |
| `is_demo` | `INTEGER` | `BOOLEAN` | No | `DEFAULT TRUE` | Flag for demonstration readings |
| `saved` | `INTEGER` | `BOOLEAN` | No | `DEFAULT FALSE` | Explicit opt-in save flag |
| `expires_at` | — | `TIMESTAMPTZ` | Yes | `NULL` | Automated cleanup expiration timestamp |

---

## 3. Privacy Safeguards & PII Handling

1. **Zero URL Exposure**: Sensitive birth data (date, time, birthplace coordinates) is never embedded in URLs. All queries use the opaque, non-guessable `id`.
2. **Zero Analytics/Log Transmission**: Birth details are not logged or sent to frontend telemetry.
3. **Encrypted Storage (At Rest & In Transit)**:
   - PostgreSQL must enforce TLS 1.3 (`sslmode=require` or `sslmode=verify-full`).
   - Production PostgreSQL databases must utilize LUKS or AWS RDS AES-256 storage encryption at rest.
4. **Third-Party Payload Sanitization**:
   - The Image Provider receives only symbol motif keywords and visual style rules — never the user's name or birthplace.
   - The Text Interpretation Provider receives only validated chart placements and first name — never full birth metadata.

---

## 4. Identifier Strategy

- Identifiers are generated using `crypto.randomBytes(12).toString("base64url")`, providing 96 bits of cryptographic entropy.
- Characteristics:
  - Non-sequential and collision-resistant.
  - Opaque (no embedded timestamps, user IDs, or birth attributes).
  - URL-safe without encoding (`A-Z`, `a-z`, `0-9`, `-`, `_`).

---

## 5. Expiration & Cleanup Rules

Automated retention and cleanup are enforced via stored procedures and scheduled jobs:

1. **Stale Generation Cleanup**:
   - Records with status `failed`, `generating`, or `pending` older than **24 hours** are deleted automatically. Uncompleted readings contain sensitive birth info without an opt-in save and must not linger.
2. **Reading Retention**:
   - Saved and unsaved readings are deleted after `READING_RETENTION_DAYS` (default **90 days**), matching the product's privacy disclosure.
3. **Save Semantics**:
   - `saved = TRUE` records explicit user opt-in and keeps a reading addressable during the retention window; it does not create indefinite retention.
4. **Explicit Expiration (`expires_at`)**:
   - Temporary links or shared previews can have an optional `expires_at` timestamp. Once passed, they are immediately purged.

---

## 6. Zero-Downtime Migration & Cutover Strategy

1. **Step 1: Schema Provisioning**
   - Apply `scripts/schema-postgres.sql` to the production PostgreSQL instance.
2. **Step 2: Database Runtime (implemented, locally contract-tested)**
   - `PostgresReadingRepository` uses a bounded `pg` pool and parameterized SQL behind the existing repository interface.
   - This does not prove a production database, schema, TLS policy, backups, or retention job.
3. **Step 3: Controlled PostgreSQL Smoke Test**
   - Run `DATABASE_URL=postgres://... npm run smoke:postgres` for a read-only connection/schema check.
   - Run `DATABASE_URL=postgres://... npm run smoke:postgres -- --apply` for a full CRUD/cleanup verification. The test creates a temporary row, validates reads/updates/saves/cleanup, and deletes the row.
   - This proves connection pool health, schema presence, the `cleanup_expired_readings()` stored procedure, and the `PostgresReadingRepository` end-to-end.
4. **Step 4: Historical Data Migration (if migrating existing dev/beta records)**
   - Dry-run first: `npm run migrate:postgres -- --source=file:./data/sabian.db`.
   - After explicit operator approval, set `POSTGRES_MIGRATION_URL` and add `--apply` to stream records with parameterized inserts (`ON CONFLICT (id) DO NOTHING`) inside one transaction.
5. **Step 5: Cutover via Environment Configuration**
   - Set `DATABASE_URL=postgres://user:password@host:5432/sabian?sslmode=require`.
   - The application automatically switches to the PostgreSQL backend upon environment variable detection without code changes.
6. **Step 6: Rollback Plan**
   - Do not silently fail over to a stale local SQLite file; that would split writes and risk data loss.
   - Restore PostgreSQL service or switch to a separately verified replica. Reverting the application version or data backend requires a reconciliation plan and operator approval.
