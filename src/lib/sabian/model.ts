/**
 * Sabian Symbol data model.
 *
 * Every symbol record carries:
 *  - A stable identity: globalIndex (1–360), sign, degree (1–30).
 *  - Active symbolic content: canonicalSymbolText, title, source, edition,
 *    ownership/license status, and editorial review status.
 *  - Original editorial commentary: originalEditorialInterpretation,
 *    keywords, lightExpression, shadowExpression, reflectionQuestion,
 *    visualMotifs.
 *
 * The authoritative wording used by readings is kept in canonicalSymbolText.
 * Verbatim third-party licensed wording may also be mirrored in
 * licensedSourceText, but project-owned original imagery leaves that field
 * empty. Source text is never merged into the editorial fields.
 */

import { z } from "zod";
import { SIGNS } from "@/lib/types";

export type LicenseStatus =
  | "public-domain-original"
  | "licensed"
  | "project-owned-original"
  | "demo-fixture"
  | "needs-licensed-content";

export const LicenseStatusSchema = z.enum([
  "public-domain-original",
  "licensed",
  "project-owned-original",
  "demo-fixture",
  "needs-licensed-content",
]);

export const EditorialReviewStatusSchema = z.enum(["reviewed", "needs-review"]);

export const SabianSymbolSchema = z
  .object({
    globalIndex: z.number().int().min(1).max(360),
    sign: z.enum(SIGNS),
    degree: z.number().int().min(1).max(30),
    title: z.string().min(1),
    /** Authoritative wording for this record (empty for demo fixtures). */
    canonicalSymbolText: z.string().default(""),
    /** Source/edition provenance. */
    sourceVersion: z.string().min(1),
    sourceAttribution: z.string().min(1),
    edition: z.string().default(""),
    licenseStatus: LicenseStatusSchema,
    /** Human/editorial disposition for production-facing original content. */
    editorialReviewStatus: EditorialReviewStatusSchema.default("needs-review"),
    /** Back-compat alias kept for existing consumers. */
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
    // Non-demo records must carry canonical wording; demo records must not.
    if (data.licenseStatus !== "demo-fixture" && !data.canonicalSymbolText.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["canonicalSymbolText"],
        message: `record ${data.sign} ${data.degree} is ${data.licenseStatus} but has no canonicalSymbolText`,
      });
    }
    if (data.licenseStatus === "demo-fixture" && data.canonicalSymbolText.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["canonicalSymbolText"],
        message: `demo-fixture record ${data.sign} ${data.degree} must not carry canonical wording`,
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
