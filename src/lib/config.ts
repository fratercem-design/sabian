/**
 * Central application configuration.
 *
 * Every piece of brand copy, color, and calculation convention used by the
 * application lives here (or in files imported from here) so it can be changed
 * in one place. All values are compile-time safe.
 *
 * Environment variables are read only on the server and only for provider
 * selection/credentials (see lib/providers/*). Brand configuration is NOT
 * read from the environment because it must be static at build time.
 *
 * NOTE: `env` below must only ever be imported from server modules; it is
 * guarded by a server-only import in the service layer, and client bundles
 * never import this module.
 */

import { z } from "zod";

export const brand = {
  name: "The Sabian Story",
  shortName: "Sabian Story",
  tagline: "Every degree contains an image. Every life unfolds a story.",
  testingBadge: "Testing Preview",
  heroStatement:
    "Your birth chart is not a verdict. It is a constellation of images — 360 symbolic degrees, each holding a picture — waiting to be read like a story.",
  howItWorks: [
    {
      title: "Share your birth moment",
      text: "A date, an exact time if you know it, and a birthplace. That is all.",
    },
    {
      title: "We calculate the sky, exactly",
      text: "Deterministic astronomy and a documented degree convention locate your principal symbols — no guessing, no AI arithmetic.",
    },
    {
      title: "You receive a story",
      text: "An original mythic reading, one image at a time, with artwork made for your placements.",
    },
  ],
} as const;

export const designTokens = {
  /** Midnight blue — primary background. */
  midnight: "#0B1020",
  /** Warm parchment — reading surfaces. */
  parchment: "#F4EAD7",
  /** Antique gold — restrained accent. */
  gold: "#C9A227",
  /** Moonlit silver — secondary text on dark. */
  silverMoon: "#A9B4C4",
  /** Dusty violet. */
  violetDust: "#8A7CA8",
  /** Muted ember. */
  ember: "#C96A4B",
} as const;

export const zodiac = {
  system: "tropical",
  systemLabel: "Tropical zodiac (equinox-anchored, IAU standard positions)",
} as const;

/** Mutable zodiac index for a full 360° circle: 1 → 360, with 360 at exactly 0° Aries. */
export const ZODIAC_MAX = 360;

export const nodeNames = {
  SUN: "Sun",
  MOON: "Moon",
  MERCURY: "Mercury",
  VENUS: "Venus",
  MARS: "Mars",
  JUPITER: "Jupiter",
  SATURN: "Saturn",
  URANUS: "Uranus",
  NEPTUNE: "Neptune",
  PLUTO: "Pluto",
  NORTH_NODE: "North Node",
  ASCENDANT: "Ascendant",
  MIDHEAVEN: "Midheaven",
} as const;

export type NodeName = (typeof nodeNames)[keyof typeof nodeNames];

export const houseSystem = {
  id: "placidus",
  label: "Placidus",
  documented:
    "Placidus is the MVP default. The choice is isolated in lib/chart/houses.ts behind the chart provider so it can be swapped without touching the rest of the application.",
} as const;

export const sabianConvention = {
  id: "degree-to-next",
  label: "Degree-to-next convention",
  rule:
    "A position within a degree corresponds to the NEXT numbered Sabian degree. A position at exactly the boundary (0°00′00″ of a sign) corresponds to that sign's first degree (degree 1) — the leading edge convention.",
  boundaries: {
    exactSignStart: "0°00′00″ of a sign → Sabian degree 1 of that sign (leading edge).",
    fraction: "0°00′01″ of a sign → Sabian degree 1 of that sign (within the first degree).",
    lastInstant: "29°59′59″ of a sign → Sabian degree 30 of that sign.",
    globalWrap: "360.0000° (exactly 0° Aries) → global index 360, which is the same as Aries 1 via the 360≡1 boundary.",
  },
} as const;

/** Deterministic seeded PRNG so demo/art output is stable across runs. */
export function seededRandom(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Environment configuration (server-side only).                       */
/* ------------------------------------------------------------------ */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:./data/sabian.db"),
  READING_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  TESTING_MODE_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .default("true")
    .transform((v) => v === "true" || v === "1"),
  MONETIZATION_ENABLED: z
    .enum(["true", "false", "1", "0"])
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  TEXT_PROVIDER: z.string().default("mock"),
  TEXT_API_KEY: z.string().optional(),
  TEXT_MODEL: z.string().optional(),
  IMAGE_PROVIDER: z.string().default("mock"),
  IMAGE_API_KEY: z.string().optional(),
  IMAGE_MODEL: z.string().optional(),
  GEOCODING_API_URL: z.string().optional(),
  GEOCODING_API_KEY: z.string().optional(),
});

/** Env parsed and validated. Never import into client components. */
export const env = envSchema.parse(process.env);

export const isTestingMode = env.TESTING_MODE_ENABLED;
export const isMonetizationEnabled = env.MONETIZATION_ENABLED;
