/**
 * Database adapter — SQLite locally (node:sqlite via a CJS shim, Node 22.13+),
 * PostgreSQL later.
 *
 * The adapter interface isolates the storage engine. `DATABASE_URL` selects
 * the backend; `file:` URLs use SQLite. A PostgreSQL implementation can be
 * added behind the same interface for production without touching the rest
 * of the application.
 */

import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import * as sqliteShim from "./sqlite-shim.cjs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { env } from "@/lib/config";

/**
 * Turbopack (dev) may turn the CJS shim into an ESM namespace, so the class
 * can arrive as `DatabaseSync`, `default.DatabaseSync`, or `default` itself.
 * Normalize to a constructor.
 */
type SqliteCtor = new (path: string) => DatabaseSyncType;

function getDatabaseSyncCtor(): SqliteCtor {
  const mod = sqliteShim as unknown as {
    DatabaseSync?: SqliteCtor;
    default?: SqliteCtor | { DatabaseSync?: SqliteCtor };
  };
  const direct = mod.DatabaseSync;
  if (direct) return direct;
  const def = mod.default;
  if (typeof def === "function") return def as SqliteCtor;
  if (def && typeof def.DatabaseSync === "function") return def.DatabaseSync;
  throw new Error("node:sqlite shim did not expose a DatabaseSync constructor");
}

export interface Db {
  exec(sql: string): void;
  run(sql: string, params?: unknown[]): void;
  get<T>(sql: string, params?: unknown[]): T | undefined;
  all<T>(sql: string, params?: unknown[]): T[];
}

class SQLiteDb implements Db {
  private db: DatabaseSyncType;
  constructor(path: string) {
    let filePath = path;
    if (filePath.startsWith("file:")) filePath = filePath.replace(/^file:/, "").split("?")[0];
    if (filePath && filePath !== ":memory:") {
      mkdirSync(dirname(filePath), { recursive: true });
    }
    const Ctor = getDatabaseSyncCtor();
    this.db = new Ctor(filePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }
  exec(sql: string) {
    this.db.exec(sql);
  }
  run(sql: string, params: unknown[] = []) {
    this.db.prepare(sql).run(...params);
  }
  get<T>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }
}

let singleton: Db | null = null;

export function getDb(): Db {
  if (!singleton) {
    const url = env.DATABASE_URL;
    if (url.startsWith("postgres") || url.startsWith("postgresql")) {
      throw new Error(
        "PostgreSQL backend not yet configured. Use DATABASE_URL=file:./data/sabian.db for local SQLite."
      );
    }
    singleton = new SQLiteDb(url);
    migrate(singleton);
  }
  return singleton;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      display_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_time TEXT,
      time_known INTEGER NOT NULL,
      time_notation TEXT,
      place_id TEXT NOT NULL,
      place_json TEXT NOT NULL,
      chart_json TEXT NOT NULL,
      interpretation_json TEXT,
      artwork_json TEXT,
      status TEXT NOT NULL,
      error TEXT,
      is_demo INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_readings_created ON readings (created_at);
  `);
}
