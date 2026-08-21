/**
 * ImageGenerationProvider — creates the three principal images.
 *
 * The demo provider generates deterministic SVG artwork locally (no external
 * calls) and returns an inline data-URL. A live provider (OpenAI/Replicate)
 * would implement the same interface; the shared visual style lives in
 * `art-style.ts` so every image feels like one collection.
 *
 * Privacy: the person's name and raw birthplace are NEVER sent to an image
 * provider. Only the sanitized visual prompt (symbol title + style) is.
 */

import type { GeneratedArtwork } from "@/lib/types";
import { createArtCache } from "@/lib/art/art-cache";

export interface ImageGenerationProvider {
  readonly name: string;
  generate(prompt: string, cacheKey: string, seed: string): Promise<GeneratedArtwork>;
}

/** Stable visual style instruction appended to every prompt. */
export const SHARED_VISUAL_STYLE =
  "Symbolist celestial painting, illuminated-manuscript detail, Art Nouveau geometry, subtle surrealism, deep indigo, lunar silver, antique gold, muted ember, tactile painted texture, contemplative and mysterious, elegant rather than kitschy, no readable text, no logos, no watermarks, no celebrity likenesses, no identifiable real people.";

/**
 * Deterministic SVG placeholder art generator.
 *
 * Produces an original, attractive emblem per symbol: a celestial wheel with
 * geometric flourishes seeded by the prompt, in the app's palette. Clearly
 * labeled as demo artwork by the consumer.
 */
export function generateDemoSvg(prompt: string, seed: string): string {
  let h = 2166136261 >>> 0;
  const str = `${prompt}|${seed}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  const cx = 240;
  const cy = 240;
  const r1 = 90 + rand() * 40;
  const r2 = r1 + 34;
  const rot = rand() * 360;
  const petalCount = 6 + Math.floor(rand() * 6);
  const petals = Array.from({ length: petalCount }, (_, i) => {
    const a = (i / petalCount) * 360 + rot;
    const rad = (a * Math.PI) / 180;
    const x = cx + Math.cos(rad) * r2;
    const y = cy + Math.sin(rad) * r2;
    const s = 10 + rand() * 18;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="none" stroke="#C9A227" stroke-width="1.2" opacity="0.75"/>`;
  }).join("");

  const stars = Array.from({ length: 14 }, () => {
    const a = rand() * 360;
    const rad = (a * Math.PI) / 180;
    const rr = r1 + rand() * (r2 - r1);
    const x = cx + Math.cos(rad) * rr;
    const y = cy + Math.sin(rad) * rr;
    const s = 1 + rand() * 2.4;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="#A9B4C4" opacity="0.6"/>`;
  }).join("");

  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360;
    const rad = (a * Math.PI) / 180;
    const x1 = cx + Math.cos(rad) * (r2 + 8);
    const y1 = cy + Math.sin(rad) * (r2 + 8);
    const x2 = cx + Math.cos(rad) * (r2 + 22);
    const y2 = cy + Math.sin(rad) * (r2 + 22);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8A7CA8" stroke-width="1" opacity="0.5"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480" role="img" aria-label="Demo celestial emblem">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0%" stop-color="#1A2440"/>
      <stop offset="100%" stop-color="#0B1020"/>
    </radialGradient>
  </defs>
  <rect width="480" height="480" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r2 + 26}" fill="none" stroke="#C9A227" stroke-width="0.8" opacity="0.35" stroke-dasharray="2 6"/>
  ${rays}
  <circle cx="${cx}" cy="${cy}" r="${r2}" fill="none" stroke="#C9A227" stroke-width="1.4"/>
  <circle cx="${cx}" cy="${cy}" r="${r1}" fill="none" stroke="#A9B4C4" stroke-width="1" opacity="0.7"/>
  <circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="#C96A4B" stroke-width="1.6" opacity="0.9"/>
  <circle cx="${cx}" cy="${cy}" r="8" fill="#E3C766"/>
  ${petals}
  ${stars}
  <text x="${cx}" y="452" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#A9B4C4" letter-spacing="3" opacity="0.8">DEMO ARTWORK — ORIGINAL EMBLEM</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export class MockImageGenerationProvider implements ImageGenerationProvider {
  readonly name = "deterministic mock (demo SVG)";

  async generate(prompt: string, cacheKey: string, seed: string): Promise<GeneratedArtwork> {
    const cache = createArtCache();
    const cached = cache.get(cacheKey);
    if (cached) return cached;
    const artwork = {
      key: cacheKey,
      imageUrl: generateDemoSvg(prompt, seed),
      source: "placeholder" as const,
      altText: "Original demo emblem artwork representing this Sabian symbol",
      prompt,
    };
    cache.set(cacheKey, artwork);
    return artwork;
  }
}

export function createImageGenerationProvider(): ImageGenerationProvider {
  return new MockImageGenerationProvider();
}
