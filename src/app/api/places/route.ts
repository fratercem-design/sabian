import { NextResponse } from "next/server";
import { selectPlaceSearchProvider } from "@/lib/places/provider";
import { signPlaceToken } from "@/lib/places/place-token";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

/**
 * GET /api/places?q=...
 * Searches the place index (local index by default, live provider when
 * configured). Only the free-text query is used; no birth data is ever sent to
 * a third party.
 *
 * Result ids are safe to pass back as `placeId`:
 *  - The local provider returns stable fixture ids resolved server-side.
 *  - A live provider has no stable id lookup, so each result id is replaced by
 *    a signed place token carrying the server-validated place; the review and
 *    reading endpoints verify it and never trust client coordinates/timezones.
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
  // If the provider cannot resolve a stable id later, sign each result so the
  // exact server-validated place round-trips through review/create.
  const out =
    typeof provider.getById === "function"
      ? results
      : results.map((r) => ({ ...r, id: signPlaceToken(r) }));
  return NextResponse.json({ results: out });
}
