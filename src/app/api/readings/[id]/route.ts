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
 * DELETE /api/readings/[id]
 * Explicitly deletes a reading and all stored birth data.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const service = createReadingService();
  const deleted = await service.delete(id);
  return NextResponse.json({ deleted }, { status: deleted ? 200 : 404 });
}
