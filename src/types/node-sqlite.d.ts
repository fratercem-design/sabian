/**
 * node:sqlite is accessed via createRequire in the DB adapter (see
 * src/lib/db/adapter.ts) so Vite's transform never resolves it as a URL.
 * Remove this file when @types/node covers node:sqlite.
 */

declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    };
    close(): void;
  }
}
