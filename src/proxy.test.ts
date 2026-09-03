import { describe, expect, it, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { getClientKey } from "@/proxy";

/** A real Request — getClientKey only reads headers, but keep it faithful. */
function req(headers: Record<string, string>): NextRequest {
  return new Request("http://localhost/api/test", { headers }) as unknown as NextRequest;
}

// Save and restore rather than delete: the variable may be set in the ambient
// environment, and clobbering it would leak into unrelated tests.
const originalHops = process.env.TRUSTED_PROXY_HOPS;
afterEach(() => {
  if (originalHops === undefined) {
    delete process.env.TRUSTED_PROXY_HOPS;
  } else {
    process.env.TRUSTED_PROXY_HOPS = originalHops;
  }
});

describe("getClientKey", () => {
  it("trusts x-vercel-forwarded-for (set by the platform edge)", () => {
    expect(getClientKey(req({ "x-vercel-forwarded-for": "203.0.113.7" }))).toEqual({
      key: "203.0.113.7",
      source: "trusted",
    });
  });

  // Regression guard: these headers are client-settable. Trusting either one
  // let an attacker mint an unlimited number of rate-limit buckets simply by
  // varying the header, fully bypassing the limiter.
  it("does NOT trust cf-connecting-ip", () => {
    const { key, source } = getClientKey(req({ "cf-connecting-ip": "10.1.0.1" }));
    expect(source).toBe("untrusted");
    expect(key).not.toBe("10.1.0.1");
  });

  it("does NOT trust x-real-ip", () => {
    const { key, source } = getClientKey(req({ "x-real-ip": "10.2.0.1" }));
    expect(source).toBe("untrusted");
    expect(key).not.toBe("10.2.0.1");
  });

  it("ignores x-forwarded-for when no trusted hop count is configured", () => {
    const { source } = getClientKey(req({ "x-forwarded-for": "10.0.0.1" }));
    expect(source).toBe("untrusted");
  });

  it("collapses spoofed headers onto ONE shared key, not one bucket each", () => {
    const a = getClientKey(req({ "cf-connecting-ip": "10.1.0.1" }));
    const b = getClientKey(req({ "x-real-ip": "10.2.0.9" }));
    const c = getClientKey(req({ "x-forwarded-for": "10.3.0.4" }));
    expect(new Set([a.key, b.key, c.key]).size).toBe(1);
  });

  it("takes the rightmost untrusted hop when TRUSTED_PROXY_HOPS is set", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    // client-forged, real-client, trusted-proxy
    const r = req({ "x-forwarded-for": "1.1.1.1, 198.51.100.5, 192.0.2.1" });
    expect(getClientKey(r)).toEqual({ key: "198.51.100.5", source: "trusted" });
  });

  it("rejects a forged chain shorter than the declared hop count", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const { source } = getClientKey(req({ "x-forwarded-for": "1.1.1.1" }));
    expect(source).toBe("untrusted");
  });

  it("prefers the platform header over a forged proxy chain", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    const r = req({
      "x-vercel-forwarded-for": "203.0.113.7",
      "cf-connecting-ip": "10.1.0.1",
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    });
    expect(getClientKey(r).key).toBe("203.0.113.7");
  });
});
