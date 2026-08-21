/**
 * Zod validation contract for AI interpretation output.
 *
 * Only validated chart and symbol data is ever passed to the interpretation
 * provider, and the provider's output must conform to this schema or it is
 * rejected (with one retry, then a graceful failure state preserving the
 * deterministic chart).
 */

import { z } from "zod";

export const ChapterSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(20),
});

export const PlanetCardSchema = z.object({
  planet: z.string().min(1),
  sabianDegree: z.number().int().min(1).max(30),
  sign: z.string().min(1),
  keywords: z.array(z.string()).min(1).max(6),
  interpretation: z.string().min(20),
  relationship: z.string().min(20),
});

export const GateSchema = z.object({
  title: z.string().min(1),
  placement: z.string().min(1),
  symbol: z.string().min(1),
  interpretation: z.string().min(40),
  light: z.string().min(10),
  shadow: z.string().min(10),
  reflectionQuestion: z.string().min(5),
});

export const AscendantSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    title: z.string().min(1),
    placement: z.string().min(1),
    symbol: z.string().min(1),
    interpretation: z.string().min(40),
    light: z.string().min(10),
    shadow: z.string().min(10),
    reflectionQuestion: z.string().min(5),
  }),
  z.object({
    available: z.literal(false),
    explanation: z.string().min(20),
  }),
]);

export const InterpretationSchema = z.object({
  summary: z.string().min(40),
  coreThemes: z.array(z.string()).min(1).max(6),
  sun: GateSchema,
  moon: GateSchema,
  ascendant: AscendantSchema,
  planets: z.array(PlanetCardSchema).min(1).max(10),
  tensions: z.array(z.string()).min(1).max(6),
  story: z.array(ChapterSchema).length(7),
  journalPrompts: z.array(z.string()).min(3).max(3),
  groundingExercise: z.string().min(30),
  affirmation: z.string().min(5),
  imagePrompts: z.object({
    sun: z.string().min(20),
    moon: z.string().min(20),
    ascendant: z.string().min(20),
  }),
  safetyDisclaimer: z.string().min(20),
});

export type InterpretationInput = {
  displayName: string;
  timeKnown: boolean;
  place: { displayName: string; country?: string; timezone: string; latitude: number; longitude: number };
  birthDate: string;
  birthTime?: string;
  placements: Array<{
    key: string;
    name: string;
    sign: string;
    degree: number;
    minute: number;
    second: number;
    sabianDegree: number;
    globalIndex: number;
  }>;
  symbols: Array<{
    globalIndex: number;
    sign: string;
    degree: number;
    title: string;
    licensedSourceText?: string;
    licenseStatus?: string;
    keywords: string[];
    lightExpression: string;
    shadowExpression: string;
    reflectionQuestion: string;
  }>;
  moonUncertain?: boolean;
  houseSystem?: string;
};

export type InterpretationOutput = z.infer<typeof InterpretationSchema>;

/** Zod-validate an interpretation response. */
export function validateInterpretation(raw: unknown): { ok: true; data: InterpretationOutput } | { ok: false; errors: string[] } {
  const result = InterpretationSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}
