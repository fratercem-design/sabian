/**
 * PostgreSQL ReadingRepository implementation.
 *
 * This module owns all PostgreSQL-specific SQL. It never performs chart or
 * interpretation work; it only persists already-validated Reading objects.
 * All visitor-controlled values are passed as query parameters.
 */

import { Pool } from "pg";
import { env } from "@/lib/config";
import type { ReadingRepository } from "@/lib/db/reading-repository";
import type { PlaceResult, Reading } from "@/lib/types";

export interface PostgresQueryResult<T> {
  rows: T[];
  rowCount: number | null;
}

export interface PostgresQueryable {
  query<T>(text: string, params?: unknown[]): Promise<PostgresQueryResult<T>>;
}

interface PostgresReadingRow {
  id: string;
  created_at: Date | string;
  display_name: string;
  birth_date: Date | string;
  birth_time: string | null;
  time_known: boolean;
  time_notation: string | null;
  place_id: string;
  place_json: PlaceResult | string;
  chart_json: Reading["chart"] | string;
  interpretation_json: Reading["interpretation"] | string | null;
  artwork_json: Reading["artwork"] | string | null;
  providers_json: Reading["providers"] | string | null;
  status: Reading["status"];
  error: string | null;
  is_demo: boolean;
  saved: boolean;
}

function jsonValue<T>(value: T | string | null): T | null {
  if (value === null) return null;
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}

function isoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function calendarDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function postgresRowToReading(row: PostgresReadingRow): Reading {
  const place = jsonValue<PlaceResult>(row.place_json);
  const chart = jsonValue<Reading["chart"]>(row.chart_json);
  if (!place || !chart) throw new Error("PostgreSQL reading row is missing required JSON data");
  return {
    id: row.id,
    createdAt: isoDate(row.created_at),
    displayName: row.display_name,
    birthDate: calendarDate(row.birth_date),
    birthTime: row.birth_time ?? undefined,
    timeKnown: row.time_known,
    timeNotation: row.time_notation ?? undefined,
    place,
    chart,
    interpretation: jsonValue<Reading["interpretation"]>(row.interpretation_json) ?? undefined,
    artwork: jsonValue<Reading["artwork"]>(row.artwork_json) ?? undefined,
    providers:
      jsonValue<Reading["providers"]>(row.providers_json) ?? {
        interpretation: "unknown",
        image: "unknown",
        symbolDatasetIsDemo: row.is_demo,
      },
    status: row.status,
    error: row.error ?? undefined,
    isDemo: row.is_demo,
    saved: row.saved,
  };
}

export class PostgresReadingRepository implements ReadingRepository {
  constructor(private readonly db: PostgresQueryable) {}

  async create(reading: Reading): Promise<Reading> {
    await this.db.query(
      `INSERT INTO readings (
        id, created_at, display_name, birth_date, birth_time, time_known,
        time_notation, place_id, place_json, chart_json, interpretation_json,
        artwork_json, providers_json, status, error, is_demo, saved
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb,
        $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16, $17
      )`,
      [
        reading.id,
        reading.createdAt,
        reading.displayName,
        reading.birthDate,
        reading.birthTime ?? null,
        reading.timeKnown,
        reading.timeNotation ?? null,
        reading.place.id,
        JSON.stringify(reading.place),
        JSON.stringify(reading.chart),
        reading.interpretation ? JSON.stringify(reading.interpretation) : null,
        reading.artwork ? JSON.stringify(reading.artwork) : null,
        JSON.stringify(reading.providers),
        reading.status,
        reading.error ?? null,
        reading.isDemo,
        reading.saved,
      ]
    );
    return reading;
  }

  async update(reading: Reading): Promise<Reading> {
    await this.db.query(
      `UPDATE readings SET
        interpretation_json = $1::jsonb,
        artwork_json = $2::jsonb,
        providers_json = $3::jsonb,
        status = $4,
        error = $5,
        is_demo = $6,
        saved = $7
      WHERE id = $8`,
      [
        reading.interpretation ? JSON.stringify(reading.interpretation) : null,
        reading.artwork ? JSON.stringify(reading.artwork) : null,
        JSON.stringify(reading.providers),
        reading.status,
        reading.error ?? null,
        reading.isDemo,
        reading.saved,
        reading.id,
      ]
    );
    return reading;
  }

  async getById(id: string): Promise<Reading | null> {
    const result = await this.db.query<PostgresReadingRow>(
      "SELECT * FROM readings WHERE id = $1",
      [id]
    );
    return result.rows[0] ? postgresRowToReading(result.rows[0]) : null;
  }

  async markSaved(id: string): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      "UPDATE readings SET saved = TRUE WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rowCount === 1;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query<{ id: string }>(
      "DELETE FROM readings WHERE id = $1 RETURNING id",
      [id]
    );
    return result.rowCount === 1;
  }

  async cleanup(days: number): Promise<number> {
    const result = await this.db.query<{ deleted_count: number | string }>(
      "SELECT cleanup_expired_readings($1) AS deleted_count",
      [days]
    );
    return Number(result.rows[0]?.deleted_count ?? 0);
  }
}

let pool: Pool | null = null;

function pooledQueryable(): PostgresQueryable {
  pool ??= new Pool({
    connectionString: env.DATABASE_URL,
    max: env.POSTGRES_POOL_MAX,
    connectionTimeoutMillis: env.POSTGRES_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
  });
  return {
    query: async <T>(text: string, params: unknown[] = []) => {
      const result = await pool!.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount };
    },
  };
}

export function createPostgresReadingRepository(
  queryable: PostgresQueryable = pooledQueryable()
): ReadingRepository {
  return new PostgresReadingRepository(queryable);
}
