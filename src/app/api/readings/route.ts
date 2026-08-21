import { NextResponse } from "next/server";
import { z } from "zod";
import { createReadingService } from "@/lib/reading/service";
import { isValidCalendarDate } from "@/lib/time/birthtime";

export const runtime = "nodejs";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * timeKnown=true REQUIRES a birthTime. When timeKnown=false, birthTime must
 * be absent (a silent midnight substitution is never allowed).
 */
const CreateReadingSchema = z
  .object({
    displayName: z.string().min(1).max(60),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(timePattern).optional(),
    timeKnown: z.boolean(),
    /** Optional explicit offset choice for ambiguous (DST overlap) times. */
    overlapOffsetChoice: z.enum(["daylight", "standard"]).optional(),
    placeId: z.string().min(1),
    consent: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (!isValidCalendarDate(data.birthDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDate"],
        message: `Not a real calendar date: ${data.birthDate}`,
      });
    }
    if (data.timeKnown && !data.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthTime"],
        message: "birthTime is required when timeKnown is true",
      });
    }
    if (!data.timeKnown && data.birthTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthTime"],
        message: "birthTime must be omitted when timeKnown is false",
      });
    }
  });

/**
 * POST /api/readings
 * Creates a reading. Birth data is sent in the request BODY only — never in
 * URLs. The response includes the reading with a random, non-guessable id.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CreateReadingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid birth data",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    );
  }
  const service = createReadingService();
  try {
    const reading = await service.create(parsed.data);
    return NextResponse.json({ reading }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create reading";
    // Client-correctable input errors (DST gaps, etc.) are 400s; internal
    // failures are 500s.
    if (/never existed|Invalid calendar date|Invalid local time/.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
