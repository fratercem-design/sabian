/**
 * Sabian Symbol data model.
 *
 * Every symbol record carries:
 *  - A stable identity: globalIndex (1–360), sign, degree (1–30).
 *  - Source/rights fields: sourceVersion, sourceAttribution, licenseStatus,
 *    licensedSourceText (verbatim, authorized wording only).
 *  - Original editorial commentary: originalEditorialInterpretation,
 *    keywords, lightExpression, shadowExpression, reflectionQuestion,
 *    visualMotifs.
 *
 * Canonical or licensed source wording is ALWAYS kept in licensedSourceText
 * and NEVER merged into the editorial fields. No Sabian website or book text
 * is scraped or reproduced here.
 */

import { z } from "zod";
import { SIGNS } from "@/lib/types";

export type LicenseStatus =
  | "public-domain-original"
  | "licensed"
  | "demo-fixture"
  | "needs-licensed-content";

export const SabianSymbolSchema = z
  .object({
    globalIndex: z.number().int().min(1).max(360),
    sign: z.enum(SIGNS),
    degree: z.number().int().min(1).max(30),
    title: z.string().min(1),
    sourceVersion: z.string().min(1),
    sourceAttribution: z.string().min(1),
    licenseStatus: z.enum(["public-domain-original", "licensed", "demo-fixture", "needs-licensed-content"]),
    licensedSourceText: z.string().default(""),
    originalEditorialInterpretation: z.string().min(1),
    keywords: z.array(z.string()).default([]),
    lightExpression: z.string().default(""),
    shadowExpression: z.string().default(""),
    reflectionQuestion: z.string().default(""),
    visualMotifs: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    // globalIndex must be consistent with sign + degree under the
    // leading-edge convention (Aries 1 = 1 … Pisces 30 = 360).
    const signIndex = SIGNS.indexOf(data.sign);
    const expected = signIndex * 30 + data.degree;
    if (data.globalIndex !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["globalIndex"],
        message: `globalIndex ${data.globalIndex} inconsistent with ${data.sign} ${data.degree} (expected ${expected})`,
      });
    }
  });

export type SabianSymbol = z.infer<typeof SabianSymbolSchema>;

/** Look up a symbol by (sign, degree). */
export function findSymbol(
  dataset: SabianSymbol[],
  sign: string,
  degree: number
): SabianSymbol | undefined {
  return dataset.find((s) => s.sign === sign && s.degree === degree);
}

/** Look up a symbol by global index 1–360. */
export function findSymbolByGlobalIndex(
  dataset: SabianSymbol[],
  globalIndex: number
): SabianSymbol | undefined {
  return dataset.find((s) => s.globalIndex === globalIndex);
}
