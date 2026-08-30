/**
 * resolvePlace — the single, server-side way to resolve a `placeId` into a
 * trusted PlaceResult.
 *
 * Every code path that needs to turn a selected place into coordinates and an
 * IANA timezone MUST go through this function, so `/api/places`, the review
 * endpoint, and reading creation all agree. Resolution order:
 *
 *   1. A signed live place token (server-issued, HMAC-verified). Live geocoding
 *      results carry these; the exact server-validated place is recovered and
 *      client-supplied coordinates/timezones are never trusted.
 *   2. The selected provider's stable-id lookup (local fixture index, or any
 *      future provider that supports id lookup).
 *   3. The local fixture index as a final fallback, so demo fixture ids always
 *      resolve even when a live provider is configured.
 *
 * Returns null when the place cannot be resolved; callers surface that as a
 * 400 "could not be resolved" error rather than proceeding with guesses.
 */

import { selectPlaceSearchProvider, LocalPlaceSearchProvider } from "@/lib/places/provider";
import { verifyPlaceToken } from "@/lib/places/place-token";
import type { PlaceResult } from "@/lib/types";

const localIndex = new LocalPlaceSearchProvider();

export async function resolvePlace(placeId: string): Promise<PlaceResult | null> {
  if (typeof placeId !== "string" || placeId.length === 0) return null;

  const fromToken = verifyPlaceToken(placeId);
  if (fromToken) return fromToken;

  const provider = selectPlaceSearchProvider();
  if (typeof provider.getById === "function") {
    const found = await provider.getById(placeId);
    if (found) return found;
  }

  return localIndex.getById(placeId);
}
