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

function applyRateLimit(request: NextRequest): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

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
