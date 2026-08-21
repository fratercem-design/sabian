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
  mkdirSync(ART_CACHE_DIR, { recursive: true });
  return {
    get(key) {
      const file = join(ART_CACHE_DIR, `${key}.json`);
      if (!existsSync(file)) return null;
      try {
        return JSON.parse(readFileSync(file, "utf8")) as GeneratedArtwork;
      } catch {
        return null;
      }
    },
    set(key, artwork) {
      try {
        writeFileSync(join(ART_CACHE_DIR, `${key}.json`), JSON.stringify(artwork), "utf8");
      } catch {
        // Non-fatal: generation still succeeds, caching is best-effort.
      }
    },
    cleanup(days) {
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
