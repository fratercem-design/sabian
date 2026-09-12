export interface PlaceResult {
  id: string;
  displayName: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface ReviewResult {
  place: PlaceResult;
  utcIso: string | null;
  referenceUtcIso?: string;
  offsetLabel: string;
  dstKind: string;
  timeKnown: boolean;
  timeNotation: string | null;
}

export interface Placement {
  key: string;
  name: string;
  glyph: string;
  sign: string;
  degree: number;
  minute: number;
  second: number;
  sabianDegree: number;
}

export interface Lens {
  title: string;
  placement: string;
  symbol: string;
  interpretation: string;
  light: string;
  shadow: string;
  reflectionQuestion: string;
}

export interface Reading {
  id: string;
  displayName: string;
  birthDate: string;
  birthTime?: string;
  timeKnown: boolean;
  place: PlaceResult;
  status: "pending" | "generating" | "ready" | "failed";
  saved: boolean;
  isDemo: boolean;
  error?: string;
  chart: {
    placements: Placement[];
    timeUncertaintyNote?: string;
  };
  interpretation?: {
    summary: string;
    coreThemes: string[];
    sun: Lens;
    moon: Lens;
    ascendant: ({ available: true } & Lens) | { available: false; explanation: string };
    story: Array<{ title: string; body: string }>;
    journalPrompts: string[];
    groundingExercise: string;
    affirmation: string;
    safetyDisclaimer: string;
  };
}
