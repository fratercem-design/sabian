import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultRateLimiter, untrustedFallbackLimiter } from "@/lib/rate-limit";

/**
 * Next.js proxy — applies global policies to API routes.
 *
 * Current responsibilities:
 *  - Rate-limit API endpoints per client.
 */
export function proxy(request: NextRequest) {
  const res = applyRateLimit(request);
  if (res) return res;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};

/**
 * Where a client identity came from.
 *
 * "trusted" — set by infrastructure we control, which overwrites any
 *   client-supplied copy. Safe to key a per-client rate limit on.
 * "untrusted" — no such source was available. NO inbound header is
 *   trustworthy on its own: a client can send `cf-connecting-ip`,
 *   `x-real-ip`, or `x-forwarded-for` with any value it likes, so keying on
 *   one without a proxy in front lets an attacker mint unlimited buckets.
 */
export type ClientKeySource = "trusted" | "untrusted";

export interface ClientKey {
  key: string;
  source: ClientKeySource;
}

/**
 * Derive a rate-limit key from a request.
 *
 * Only two sources are trusted, in order:
 *
 *  1. `x-vercel-forwarded-for` — set by Vercel's edge, which strips any
 *     client-supplied copy. This is the deployment target.
 *  2. `x-forwarded-for`, but ONLY when TRUSTED_PROXY_HOPS declares how many
 *     proxies sit in front. We then take the rightmost hop the client could
 *     not have appended. Leftmost is always attacker-controlled.
 *
 * `cf-connecting-ip` and `x-real-ip` are deliberately NOT trusted: they are
 * only meaningful behind Cloudflare or a proxy that sets them, and that case
 * is already covered by TRUSTED_PROXY_HOPS.
 */
export function getClientKey(request: NextRequest): ClientKey {
  const vercel = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercel) return { key: vercel, source: "trusted" };

  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? "0");
  if (hops > 0) {
    const chain = (request.headers.get("x-forwarded-for") ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const index = chain.length - 1 - hops;
    if (index >= 0) return { key: chain[index], source: "trusted" };
  }

  return { key: "__untrusted__", source: "untrusted" };
}

let warnedUntrusted = false;

function applyRateLimit(request: NextRequest): NextResponse | null {
  const { key, source } = getClientKey(request);

  // With no trustworthy client identity every request would share a single
  // bucket, throttling all legitimate users collectively while an attacker
  // escapes by sending a header. So the untrusted path gets its own
  // high-capacity global ceiling instead: still bounded, but it does not
  // strangle normal traffic. On Vercel this path is unreachable; reaching it
  // means the deployment is misconfigured, so say so loudly.
  const limiter = source === "trusted" ? defaultRateLimiter : untrustedFallbackLimiter;
  if (source === "untrusted" && process.env.NODE_ENV === "production" && !warnedUntrusted) {
    warnedUntrusted = true;
    console.error(
      "[rate-limit] No trusted client IP source. Expected x-vercel-forwarded-for, " +
        "or set TRUSTED_PROXY_HOPS when behind your own proxy. " +
        "Falling back to a single global ceiling — per-client limiting is NOT active."
    );
  }

  const result = limiter.check(key);
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.reset));

  if (!result.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers }
    );
  }

  const next = NextResponse.next();
  next.headers.set("X-RateLimit-Limit", String(result.limit));
  next.headers.set("X-RateLimit-Remaining", String(result.remaining));
  next.headers.set("X-RateLimit-Reset", String(result.reset));
  return next;
}
