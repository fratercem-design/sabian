import { NextResponse } from "next/server";
import { createReadingService } from "@/lib/reading/service";

export const runtime = "nodejs";

/**
 * GET /api/readings/[id]
 * Returns a reading by its random id, or 404.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const service = createReadingService();
  const reading = await service.get(id);
  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }
  return NextResponse.json({ reading });
}

/**
 * PATCH /api/readings/[id]
 * Explicit opt-in save: marks a generated reading as saved (retention applies
 * only from this point). No birth data is sent in the URL or body.
 */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const service = createReadingService();
  const saved = await service.saveReading(id);
  return NextResponse.json({ saved }, { status: saved ? 200 : 404 });
}

/**
 * DELETE /api/readings/[id]
 * Explicitly deletes a reading and all stored birth data.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const service = createReadingService();
  const deleted = await service.delete(id);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}
