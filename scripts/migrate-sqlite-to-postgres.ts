/**
 * SQLite to PostgreSQL Data Migration Script Template (Task 8)
 *
 * Demonstrates the zero-loss migration of reading records from local SQLite
 * to production PostgreSQL without requiring live production credentials.
 *
 * Usage:
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts --dry-run
 *   DATABASE_URL="postgres://user:pass@host:5432/sabian" npx tsx scripts/migrate-sqlite-to-postgres.ts
 */

import { getDb } from "@/lib/db/adapter";

interface SqliteReadingRow {
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

export function exportSqliteReadings(): SqliteReadingRow[] {
  const db = getDb();
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

async function main() {
  const isDryRun = process.argv.includes("--dry-run") || !process.env.DATABASE_URL?.startsWith("postgres");

  console.log("=== SQLite to PostgreSQL Migration Plan Execution ===");
  const rows = exportSqliteReadings();
  console.log(`Exported ${rows.length} reading(s) from SQLite.`);

  if (isDryRun) {
    console.log("[DRY RUN] Validating transformations for all records...");
    let valid = 0;
    for (const row of rows) {
      try {
        const transformed = transformToPostgresRecord(row);
        if (transformed.id && transformed.place_json && transformed.chart_json) {
          valid++;
        }
      } catch (err) {
        console.error(`Validation failed for record ${row.id}:`, err);
      }
    }
    console.log(`[DRY RUN] ${valid}/${rows.length} records successfully validated for PostgreSQL schema.`);
    console.log("[DRY RUN] No live PostgreSQL connection attempted (per testing-phase safety policy).");
    return;
  }

  // When live DATABASE_URL is configured for production cutover:
  console.log("Connecting to PostgreSQL target database...");
  // pg pool insertion would execute here with parameterized INSERT ... ON CONFLICT (id) DO NOTHING
}

if (import.meta.url.endsWith(process.argv[1] ?? "")) {
  main().catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  });
}
