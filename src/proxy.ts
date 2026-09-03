import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultRateLimiter } from "@/lib/rate-limit";

/**
 * Next.js proxy — applies global policies to API routes.
 *
 * Current responsibilities:
 *  - Rate-limit API endpoints per IP.
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
 * Derive a per-client key for rate limiting from a request.
 *
 * Prefers headers that the client cannot set, and only uses X-Forwarded-For
 * when the deployment explicitly declares how many trusted proxy hops sit in
 * front of the application. With no trusted proxies declared, X-Forwarded-For
 * is ignored because the leftmost value is attacker-controlled.
 */
export function getClientKey(request: NextRequest): string {
  const trustedProxyHops = Number(process.env.TRUSTED_PROXY_HOPS ?? "0");

  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff && trustedProxyHops > 0) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const index = hops.length - 1 - trustedProxyHops;
    if (index >= 0 && index < hops.length) {
      return hops[index];
    }
  }

  return "unknown";
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientKey(request);

  const result = defaultRateLimiter.check(ip);
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

  // Pass the limit headers through to the response.
  const next = NextResponse.next({ request: { headers } });
  next.headers.set("X-RateLimit-Limit", String(result.limit));
  next.headers.set("X-RateLimit-Remaining", String(result.remaining));
  next.headers.set("X-RateLimit-Reset", String(result.reset));
  return next;
}
