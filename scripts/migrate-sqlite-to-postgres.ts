/**
 * SQLite -> PostgreSQL reading migration.
 *
 * Safe default: transformation-only dry run. A live target is touched only
 * when --apply is present and POSTGRES_MIGRATION_URL (or DATABASE_URL) is a
 * PostgreSQL URL. The SQLite source is always selected independently, so a
 * PostgreSQL target can never accidentally be opened through the SQLite shim.
 *
 * Dry run:
 *   npm run migrate:postgres -- --source=file:./data/sabian.db
 * Apply (requires explicit operator approval):
 *   POSTGRES_MIGRATION_URL=postgres://... npm run migrate:postgres -- --apply
 */

import { Pool } from "pg";
import { openSqliteDb, type Db } from "@/lib/db/adapter";

export interface SqliteReadingRow {
  id: string;
  created_at: string;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  time_known: number;
  time_notation: string | null;
  place_id: string;
  place_json: string;
  chart_json: string;
  interpretation_json: string | null;
  artwork_json: string | null;
  providers_json: string | null;
  status: string;
  error: string | null;
  is_demo: number;
  saved: number;
}

export function exportSqliteReadings(db: Db): SqliteReadingRow[] {
  return db.all<SqliteReadingRow>("SELECT * FROM readings ORDER BY created_at ASC");
}

export function transformToPostgresRecord(row: SqliteReadingRow) {
  return {
    id: row.id,
    created_at: new Date(row.created_at).toISOString(),
    display_name: row.display_name,
    birth_date: row.birth_date,
    birth_time: row.birth_time,
    time_known: row.time_known === 1,
    time_notation: row.time_notation,
    place_id: row.place_id,
    place_json: JSON.parse(row.place_json),
    chart_json: JSON.parse(row.chart_json),
    interpretation_json: row.interpretation_json ? JSON.parse(row.interpretation_json) : null,
    artwork_json: row.artwork_json ? JSON.parse(row.artwork_json) : null,
    providers_json: row.providers_json ? JSON.parse(row.providers_json) : {},
    status: row.status,
    error: row.error,
    is_demo: row.is_demo === 1,
    saved: row.saved === 1,
  };
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function isPostgresUrl(value: string | undefined): value is string {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const sourceUrl =
    argValue("source") ?? process.env.SQLITE_SOURCE_URL ?? "file:./data/sabian.db";
  const targetUrl = process.env.POSTGRES_MIGRATION_URL ?? process.env.DATABASE_URL;

  if (isPostgresUrl(sourceUrl)) {
    throw new Error("SQLite source must be a file: URL or filesystem path, never a PostgreSQL URL");
  }

  const source = openSqliteDb(sourceUrl);
  const rows = exportSqliteReadings(source);
  const transformed = rows.map(transformToPostgresRecord);
  console.log(`Validated ${transformed.length}/${rows.length} SQLite reading records.`);

  if (!apply) {
    console.log("[DRY RUN] No PostgreSQL connection attempted. Add --apply only after operator approval.");
    return;
  }
  if (!isPostgresUrl(targetUrl)) {
    throw new Error("--apply requires POSTGRES_MIGRATION_URL (or DATABASE_URL) with a PostgreSQL URL");
  }

  const pool = new Pool({ connectionString: targetUrl, max: 1, connectionTimeoutMillis: 5_000 });
  const client = await pool.connect();
  let inserted = 0;
  try {
    const schema = await client.query<{ readings: string | null }>(
      "SELECT to_regclass('public.readings')::text AS readings"
    );
    if (!schema.rows[0]?.readings) {
      throw new Error("Target schema is missing public.readings; apply scripts/schema-postgres.sql first");
    }

    await client.query("BEGIN");
    for (const row of transformed) {
      const result = await client.query(
        `INSERT INTO readings (
          id, created_at, display_name, birth_date, birth_time, time_known,
          time_notation, place_id, place_json, chart_json, interpretation_json,
          artwork_json, providers_json, status, error, is_demo, saved
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb,
          $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16, $17
        ) ON CONFLICT (id) DO NOTHING
        RETURNING id`,
        [
          row.id,
          row.created_at,
          row.display_name,
          row.birth_date,
          row.birth_time,
          row.time_known,
          row.time_notation,
          row.place_id,
          JSON.stringify(row.place_json),
          JSON.stringify(row.chart_json),
          row.interpretation_json ? JSON.stringify(row.interpretation_json) : null,
          row.artwork_json ? JSON.stringify(row.artwork_json) : null,
          JSON.stringify(row.providers_json),
          row.status,
          row.error,
          row.is_demo,
          row.saved,
        ]
      );
      inserted += result.rowCount ?? 0;
    }
    await client.query("COMMIT");
    console.log(`Migration committed: ${inserted} inserted, ${rows.length - inserted} already present.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/") ?? "")) {
  main().catch((error) => {
    console.error("Migration failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
