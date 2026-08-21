import { NextResponse } from "next/server";
import { z } from "zod";
import { createReadingService } from "@/lib/reading/service";

export const runtime = "nodejs";

const CreateReadingSchema = z.object({
  displayName: z.string().min(1).max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  timeKnown: z.boolean(),
  placeId: z.string().min(1),
  consent: z.literal(true),
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
      { error: "Invalid birth data", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 }
    );
  }
  const service = createReadingService();
  try {
    const reading = await service.create(parsed.data);
    return NextResponse.json({ reading }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create reading";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
