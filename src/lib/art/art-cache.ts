/**
 * Artwork cache — prevents duplicate image generation on refresh.
 *
 * Art is cached on disk by a hash of (sanitized prompt + provider name).
 * Because the cache lives in the server data directory, refreshing the
 * reading reuses the same image. The cache is keyed only by the prompt hash;
 * it stores no personal data.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { GeneratedArtwork } from "@/lib/types";

const CACHE_DIR = join(process.cwd(), "data", "art-cache");

export interface ArtCache {
  get(key: string): GeneratedArtwork | null;
  set(key: string, artwork: GeneratedArtwork): void;
}

export function hashPrompt(prompt: string, provider: string): string {
  return createHash("sha256").update(`${provider}::${prompt}`).digest("hex").slice(0, 24);
}

export function createArtCache(): ArtCache {
  mkdirSync(CACHE_DIR, { recursive: true });
  return {
    get(key) {
      const file = join(CACHE_DIR, `${key}.json`);
      if (!existsSync(file)) return null;
      try {
        return JSON.parse(readFileSync(file, "utf8")) as GeneratedArtwork;
      } catch {
        return null;
      }
    },
    set(key, artwork) {
      try {
        writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(artwork), "utf8");
      } catch {
        // Non-fatal: generation still succeeds, caching is best-effort.
      }
    },
  };
}
