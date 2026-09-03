import { afterEach, describe, expect, it } from "vitest";
import { getClientKey } from "./proxy";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("getClientKey", () => {
  it("ignores x-forwarded-for by default", () => {
    const request = makeRequest({
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
    });
    expect(getClientKey(request as never)).toBe("unknown");
  });

  it("prefers cf-connecting-ip", () => {
    const request = makeRequest({
      "cf-connecting-ip": "203.0.113.1",
      "x-real-ip": "192.168.1.1",
    });
    expect(getClientKey(request as never)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = makeRequest({
      "x-real-ip": "192.168.1.1",
    });
    expect(getClientKey(request as never)).toBe("192.168.1.1");
  });
});

describe("getClientKey with TRUSTED_PROXY_HOPS", () => {
  const originalEnv = process.env.TRUSTED_PROXY_HOPS;

  it("uses the rightmost untrusted hop when trusted proxies are configured", () => {
    process.env.TRUSTED_PROXY_HOPS = "1";
    const request = makeRequest({
      "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3",
    });
    // With 1 trusted proxy hop, the client is the second entry from the right.
    expect(getClientKey(request as never)).toBe("10.0.0.2");
  });

  it("falls back to unknown when xff has too few hops", () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    const request = makeRequest({
      "x-forwarded-for": "10.0.0.1",
    });
    expect(getClientKey(request as never)).toBe("unknown");
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TRUSTED_PROXY_HOPS;
    } else {
      process.env.TRUSTED_PROXY_HOPS = originalEnv;
    }
  });
});
