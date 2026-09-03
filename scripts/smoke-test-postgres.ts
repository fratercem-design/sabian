/**
 * PostgreSQL smoke test — controlled schema/CRUD/cleanup verification.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run smoke:postgres
 *     → read-only check (connection + schema presence)
 *   DATABASE_URL=postgres://... npm run smoke:postgres -- --apply
 *     → full mutating smoke test (creates, reads, updates, saves, cleans up)
 *
 * The script exits 0 on success and non-zero on any failure. It never touches a
 * non-PostgreSQL DATABASE_URL.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { createPostgresReadingRepository } from "@/lib/db/postgres-reading-repository";
import type { Reading } from "@/lib/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

function isPostgresUrl(value: string | undefined): value is string {
  return Boolean(value?.startsWith("postgres://") || value?.startsWith("postgresql://"));
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_MIGRATION_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_MIGRATION_URL must be set to a PostgreSQL URL");
  }
  if (!isPostgresUrl(url)) {
    throw new Error("Smoke test requires a PostgreSQL DATABASE_URL");
  }
  return url;
}

function schemaPath(): string {
  return resolve(__dirname, "schema-postgres.sql");
}

async function ensureSchema(pool: Pool) {
  const sql = readFileSync(schemaPath(), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

function makeTestReading(id: string): Reading {
  return {
    id,
    createdAt: new Date().toISOString(),
    displayName: "Smoke Test",
    birthDate: "1990-06-15",
    birthTime: "14:30",
    timeKnown: true,
    place: {
      id: "smoke-test-place",
      displayName: "Smoke Test City",
      country: "Nowhere",
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
    },
    chart: {
      utcIso: "1990-06-15T13:30:00.000Z",
      timeKnown: true,
      placements: [],
      ephemerisConfig: {
        ephemeris: "smoke-test",
        ephemerisLicense: "none",
        zodiac: "tropical",
        houseSystem: "placidus",
        obliquity: "smoke-test",
        deltaT: "smoke-test",
        northNodeConvention: "smoke-test",
      },
    },
    status: "pending",
    isDemo: true,
    saved: false,
    providers: {
      interpretation: "smoke-test",
      image: "smoke-test",
      symbolDatasetIsDemo: true,
    },
  };
}

async function smokeReadOnly(pool: Pool) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ version: string }>("SELECT version()");
    console.log(`Connected: ${rows[0]?.version.split("\n")[0] ?? "PostgreSQL"}`);
    const schema = await client.query<{ readings: string | null }>(
      "SELECT to_regclass('public.readings')::text AS readings"
    );
    if (!schema.rows[0]?.readings) {
      throw new Error("Schema missing public.readings; pass --apply to create it");
    }
    console.log("Schema present: public.readings");
  } finally {
    client.release();
  }
}

async function smokeFull(pool: Pool) {
  console.log("Applying schema...");
  await ensureSchema(pool);

  const repo = createPostgresReadingRepository({
    query: async <T>(text: string, params: unknown[] = []) => {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount };
    },
  });

  const id = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const reading = makeTestReading(id);

  console.log("Creating test reading...");
  await repo.create(reading);

  console.log("Reading back...");
  const fetched = await repo.getById(id);
  if (!fetched) throw new Error("Failed to fetch created reading");
  if (fetched.displayName !== reading.displayName) {
    throw new Error("Fetched reading does not match created reading");
  }

  console.log("Updating status to ready...");
  fetched.status = "ready";
  await repo.update(fetched);

  console.log("Marking saved...");
  const saved = await repo.markSaved(id);
  if (!saved) throw new Error("markSaved returned false");

  console.log("Running retention cleanup...");
  const cleaned = await repo.cleanup(90);
  console.log(`Cleanup removed ${cleaned} expired rows (expected 0 for fresh test record)`);

  console.log("Deleting test reading...");
  const deleted = await repo.delete(id);
  if (!deleted) throw new Error("delete returned false");

  const afterDelete = await repo.getById(id);
  if (afterDelete) throw new Error("Test reading still present after delete");
}

async function main() {
  const url = getDatabaseUrl();
  const apply = process.argv.includes("--apply");

  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    if (!apply) {
      await smokeReadOnly(pool);
      console.log("\nRead-only smoke test passed. Add --apply for full CRUD/cleanup verification.");
    } else {
      await smokeFull(pool);
      console.log("\nFull PostgreSQL smoke test passed.");
    }
  } catch (error) {
    const detail = error instanceof Error ? `${error.message}${(error as { code?: string }).code ? ` (code: ${(error as { code?: string }).code})` : ""}` : String(error);
    console.error("\nPostgreSQL smoke test failed:", detail);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
