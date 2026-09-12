/**
 * Artwork cache — prevents duplicate image generation on refresh.
 *
 * Art is cached on disk by a hash of (sanitized prompt + provider name).
 * Because the cache lives in the server data directory, refreshing the
 * reading reuses the same image. The cache is keyed only by the prompt hash;
 * it stores no personal data.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { GeneratedArtwork } from "@/lib/types";

export const ART_CACHE_DIR =
  process.env.ART_CACHE_DIR ?? join(process.cwd(), "data", "art-cache");

export interface ArtCache {
  get(key: string): GeneratedArtwork | null;
  set(key: string, artwork: GeneratedArtwork): void;
  /** Remove cache entries with mtime older than `days`; returns count removed. */
  cleanup(days: number): number;
}

export function hashPrompt(prompt: string, provider: string): string {
  return createHash("sha256").update(`${provider}::${prompt}`).digest("hex").slice(0, 24);
}

export function createArtCache(): ArtCache {
  // Serverless deployments may expose the bundled project directory as
  // read-only. Disk caching is an optimization, never a prerequisite for
  // generating artwork; fall back to a per-process memory cache there.
  let diskAvailable = true;
  try {
    mkdirSync(ART_CACHE_DIR, { recursive: true });
  } catch {
    diskAvailable = false;
  }
  const memoryCache = new Map<string, GeneratedArtwork>();

  return {
    get(key) {
      const inMemory = memoryCache.get(key);
      if (inMemory) return inMemory;
      if (!diskAvailable) return null;
      const file = join(ART_CACHE_DIR, `${key}.json`);
      if (!existsSync(file)) return null;
      try {
        const artwork = JSON.parse(readFileSync(file, "utf8")) as GeneratedArtwork;
        memoryCache.set(key, artwork);
        return artwork;
      } catch {
        return null;
      }
    },
    set(key, artwork) {
      memoryCache.set(key, artwork);
      if (!diskAvailable) return;
      try {
        writeFileSync(join(ART_CACHE_DIR, `${key}.json`), JSON.stringify(artwork), "utf8");
      } catch {
        // Non-fatal: generation still succeeds, caching is best-effort.
      }
    },
    cleanup(days) {
      if (!diskAvailable) return 0;
      const cutoff = Date.now() - days * 86400000;
      let removed = 0;
      try {
        // Only ever used by the dev cleanup script, never at request time.
        // turbopackIgnore keeps the build from tracing the whole project.
        for (const f of readdirSync(/* turbopackIgnore: true */ ART_CACHE_DIR)) {
          if (!f.endsWith(".json")) continue;
          const p = join(/* turbopackIgnore: true */ ART_CACHE_DIR, f);
          try {
            if (statSync(/* turbopackIgnore: true */ p).mtimeMs < cutoff) {
              rmSync(p);
              removed++;
            }
          } catch {
            // Best-effort per entry.
          }
        }
      } catch {
        // Cache dir may not exist yet.
      }
      return removed;
    },
  };
}
