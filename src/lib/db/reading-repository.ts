/**
 * ReadingRepository — persistence for readings.
 *
 * Readings are identified by random, non-guessable IDs (nanoid-style).
 * Saved readings are OPT-IN (the user must choose to save); the repository
 * supports explicit deletion and a configurable retention policy.
 */

import { randomBytes } from "node:crypto";
import { getDb, type Db } from "@/lib/db/adapter";
import type { Reading, PlaceResult } from "@/lib/types";
import { env } from "@/lib/config";

export interface ReadingRepository {
  create(reading: Reading): Promise<Reading>;
  /** Update an existing reading (used for status transitions). */
  update(reading: Reading): Promise<Reading>;
  getById(id: string): Promise<Reading | null>;
  delete(id: string): Promise<boolean>;
  /** Remove readings older than `days` days; returns count removed. */
  cleanup(days: number): Promise<number>;
}

export function newReadingId(): string {
  return randomBytes(12).toString("base64url");
}

interface ReadingRow {
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
  status: string;
  error: string | null;
  is_demo: number;
}

export class SqliteReadingRepository implements ReadingRepository {
  private db: Db;

  constructor(db?: Db) {
    this.db = db ?? getDb();
  }

  async create(reading: Reading): Promise<Reading> {
    this.db.run(
      `INSERT INTO readings (
        id, created_at, display_name, birth_date, birth_time, time_known,
        time_notation, place_id, place_json, chart_json, interpretation_json,
        artwork_json, status, error, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reading.id,
        reading.createdAt,
        reading.displayName,
        reading.birthDate,
        reading.birthTime ?? null,
        reading.timeKnown ? 1 : 0,
        reading.timeNotation ?? null,
        reading.place.id,
        JSON.stringify(reading.place),
        JSON.stringify(reading.chart),
        reading.interpretation ? JSON.stringify(reading.interpretation) : null,
        reading.artwork ? JSON.stringify(reading.artwork) : null,
        reading.status,
        reading.error ?? null,
        reading.isDemo ? 1 : 0,
      ]
    );
    return reading;
  }

  async update(reading: Reading): Promise<Reading> {
    this.db.run(
      `UPDATE readings SET
        interpretation_json = ?, artwork_json = ?, status = ?, error = ?
        WHERE id = ?`,
      [
        reading.interpretation ? JSON.stringify(reading.interpretation) : null,
        reading.artwork ? JSON.stringify(reading.artwork) : null,
        reading.status,
        reading.error ?? null,
        reading.id,
      ]
    );
    return reading;
  }

  async getById(id: string): Promise<Reading | null> {
    const row = this.db.get<ReadingRow>(`SELECT * FROM readings WHERE id = ?`, [id]);
    if (!row) return null;
    return this.rowToReading(row);
  }

  async delete(id: string): Promise<boolean> {
    this.db.run(`DELETE FROM readings WHERE id = ?`, [id]);
    return true;
  }

  async cleanup(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const before = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM readings`)?.n ?? 0;
    this.db.run(`DELETE FROM readings WHERE created_at < ?`, [cutoff]);
    const after = this.db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM readings`)?.n ?? 0;
    return before - after;
  }

  private rowToReading(row: ReadingRow): Reading {
    const place = JSON.parse(row.place_json) as PlaceResult;
    return {
      id: row.id,
      createdAt: row.created_at,
      displayName: row.display_name,
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? undefined,
      timeKnown: row.time_known === 1,
      timeNotation: row.time_notation ?? undefined,
      place,
      chart: JSON.parse(row.chart_json),
      interpretation: row.interpretation_json ? JSON.parse(row.interpretation_json) : undefined,
      artwork: row.artwork_json ? JSON.parse(row.artwork_json) : undefined,
      status: row.status as Reading["status"],
      error: row.error ?? undefined,
      isDemo: row.is_demo === 1,
    };
  }
}

export function createReadingRepository(): ReadingRepository {
  return new SqliteReadingRepository();
}

/** Retention policy from configuration. */
export function retentionDays(): number {
  return env.READING_RETENTION_DAYS;
}
