/**
 * Signed place tokens — secure resolution of live geocoding results.
 *
 * Live geocoding APIs are search-based and have no stable id we can later
 * look up, and we must NEVER trust coordinates or timezones supplied by the
 * client. So when a live provider returns results, the server signs each
 * place into an opaque token (HMAC-SHA256 over the canonical place payload).
 * The client passes that token back as the `placeId`; the review and reading
 * endpoints verify the signature and expiry and recover the exact
 * server-validated place. A forged or expired token simply fails to resolve.
 *
 * The token payload contains ONLY the resolved place (canonical name,
 * coordinates, IANA timezone) plus an issue timestamp. No birth data is ever
 * included.
 */

/* Server-only module. Never imported from client components. */

import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/config";
import type { PlaceResult } from "@/lib/types";

/** Tokens are short-lived; a reading journey completes in minutes, not days. */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

interface TokenPayload {
  place: PlaceResult;
  /** Issued-at, ms since epoch. Used for expiry. */
  iat: number;
}

function toB64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromB64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function mac(body: string): string {
  return toB64Url(createHmac("sha256", env.PLACE_TOKEN_SECRET).update(body).digest());
}

/** Sign a resolved place into an opaque token the client can pass back. */
export function signPlaceToken(place: PlaceResult, now = Date.now()): string {
  const payload: TokenPayload = { place, iat: now };
  const body = toB64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${mac(body)}`;
}

/**
 * Verify a token and recover the server-validated place. Returns null for
 * anything malformed, forged, or expired — the caller treats null as
 * "could not be resolved", never as a trusted place.
 */
export function verifyPlaceToken(token: string, now = Date.now()): PlaceResult | null {
  if (typeof token !== "string" || token.length === 0) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = Buffer.from(mac(body));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(fromB64Url(body).toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object" || !payload.place) return null;
  if (typeof payload.iat !== "number") return null;
  if (now - payload.iat > TOKEN_TTL_MS || payload.iat - now > TOKEN_TTL_MS) return null;

  const p = payload.place;
  // Only accept a fully-formed place; coordinates and timezone are the
  // security-critical fields and must be present and well-typed.
  if (typeof p.displayName !== "string" || p.displayName.length === 0) return null;
  if (typeof p.latitude !== "number" || !Number.isFinite(p.latitude)) return null;
  if (typeof p.longitude !== "number" || !Number.isFinite(p.longitude)) return null;
  if (p.latitude < -90 || p.latitude > 90 || p.longitude < -180 || p.longitude > 180) return null;
  if (typeof p.timezone !== "string" || p.timezone.length === 0) return null;
  return p;
}
