import { NextResponse } from "next/server";
import { selectPlaceSearchProvider } from "@/lib/places/provider";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

/**
 * GET /api/places?q=...
 * Searches the place index (local index by default, live provider when configured).
 * Only the free-text query is used; no birth data is ever sent to a third party.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q"),
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const provider = selectPlaceSearchProvider();
  const results = await provider.search(parsed.data.q, parsed.data.limit);
  return NextResponse.json({ results });
}
