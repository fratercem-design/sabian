/**
 * Shared domain types for The Sabian Story.
 *
 * These types define the *validated* data shapes that flow through the
 * application: the resolved birth record, the deterministic chart, and the
 * AI interpretation. The strict separation demanded by the product brief is
 * enforced by typing: interpretation code only ever sees `ChartData` —
 * never raw planetary math — and every interpretation field is validated by
 * Zod before it is allowed to reach the database or the UI.
 */

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type Sign = (typeof SIGNS)[number];

export type ZodiacSystem = "tropical";

/** A single planet or point in the natal chart. */
export interface Placement {
  /** Stable key: sun, moon, mercury, ... ascendant, midheaven. */
  key: string;
  /** Human label, e.g. "Sun". */
  name: string;
  /** Symbol glyph used by the UI. */
  glyph: string;
  /** Exact ecliptic longitude in degrees, normalized to [0, 360). */
  longitude: number;
  /** Sign at `longitude`. */
  sign: Sign;
  /** Whole degrees within the sign, 0–29. */
  degree: number;
  /** Minutes within the degree, 0–59. */
  minute: number;
  /** Seconds within the degree, 0–59. */
  second: number;
  /** Sabian degree 1–30 for this longitude. */
  sabianDegree: number;
  /** Global zodiac index 1–360 (360 ≡ exactly 0° Aries). */
  globalIndex: number;
}

export interface HouseCusp {
  house: number;
  longitude: number;
  sign: Sign;
  degree: number;
  minute: number;
  second: number;
}

export interface EphemerisConfig {
  ephemeris: string;
  ephemerisLicense: string;
  zodiac: ZodiacSystem;
  houseSystem: string;
  obliquity: string;
  deltaT: string;
}

export interface ChartData {
  /** UTC instant of the birth moment, ISO 8601. */
  utcIso: string;
  /** Whether the birth time was exact (true) or unknown (false). */
  timeKnown: boolean;
  /** For unknown times: the local calendar date used for date-anchored calculations. */
  localDateOnly?: string;
  /** For unknown times: the solar midnight UTC approximation used (disclosed). */
  timeNotation?: string;
  /** Longitudes normalized to [0, 360). */
  placements: Placement[];
  /** Houses are only present when the birth time is known. */
  houses?: HouseCusp[];
  /** Explanatory note about what is reliable when time is unknown. */
  timeUncertaintyNote?: string;
  /** Whether the Moon may shift Sabian degree during the local calendar day. */
  moonUncertain?: boolean;
  ephemerisConfig: EphemerisConfig;
}

export interface PlaceResult {
  id: string;
  displayName: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export type ImageSource = "generated" | "placeholder" | "failed";

export interface SymbolArtwork {
  imageUrl: string;
  source: ImageSource;
  altText: string;
  prompt?: string;
  label: string;
}

/* --------------------------- Interpretation --------------------------- */

export interface Chapter {
  title: string;
  body: string;
}

export interface PlanetCard {
  planet: string;
  sabianDegree: number;
  sign: string;
  keywords: string[];
  interpretation: string;
  relationship: string;
}

export interface ReadingInterpretation {
  summary: string;
  coreThemes: string[];
  sun: {
    title: string;
    placement: string;
    symbol: string;
    interpretation: string;
    light: string;
    shadow: string;
    reflectionQuestion: string;
  };
  moon: {
    title: string;
    placement: string;
    symbol: string;
    interpretation: string;
    light: string;
    shadow: string;
    reflectionQuestion: string;
  };
  ascendant:
    | {
        available: true;
        title: string;
        placement: string;
        symbol: string;
        interpretation: string;
        light: string;
        shadow: string;
        reflectionQuestion: string;
      }
    | {
        available: false;
        explanation: string;
      };
  planets: PlanetCard[];
  tensions: string[];
  story: Chapter[];
  journalPrompts: string[];
  groundingExercise: string;
  affirmation: string;
  imagePrompts: {
    sun: string;
    moon: string;
    ascendant: string;
  };
  safetyDisclaimer: string;
}

export interface GeneratedArtwork {
  key: string;
  imageUrl: string;
  source: ImageSource;
  altText: string;
  prompt?: string;
}

export interface Reading {
  id: string;
  createdAt: string;
  displayName: string;
  place: PlaceResult;
  birthDate: string;
  birthTime?: string;
  timeKnown: boolean;
  timeNotation?: string;
  chart: ChartData;
  interpretation?: ReadingInterpretation;
  artwork?: Record<string, GeneratedArtwork>;
  status: "pending" | "generating" | "ready" | "failed";
  error?: string;
  /** True whenever mock text, mock artwork, or incomplete fixture symbols were used. */
  isDemo: boolean;
  /** Whether the user explicitly chose to save this reading (opt-in). */
  saved: boolean;
  /** Provider metadata for demo disclosure: which text/art providers ran. */
  providers: {
    interpretation: string;
    image: string;
    /** True when the symbol dataset is the demo fixture (incomplete). */
    symbolDatasetIsDemo: boolean;
  };
}

/** Entitlement tiers prepared for future monetization (never enforced in testing mode). */
export type EntitlementTier = "free" | "complete" | "art-edition" | "account";
