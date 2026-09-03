import { describe, expect, it } from "vitest";
import { TokenBucketRateLimiter } from "@/lib/rate-limit";

describe("TokenBucketRateLimiter", () => {
  it("allows requests under the limit and returns remaining tokens", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 3,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 100,
    });

    const first = limiter.check("ip-a");
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);
    expect(first.limit).toBe(3);

    const second = limiter.check("ip-a");
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(1);

    const third = limiter.check("ip-a");
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);

    const blocked = limiter.check("ip-a");
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 100,
    });

    expect(limiter.check("ip-a").ok).toBe(true);
    expect(limiter.check("ip-a").ok).toBe(true);
    expect(limiter.check("ip-a").ok).toBe(false);
    expect(limiter.check("ip-b").ok).toBe(true);
  });

  it("refills tokens over time", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 2,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 100,
    });

    const now = Date.now();
    expect(limiter.check("ip-a", now).remaining).toBe(1);
    expect(limiter.check("ip-a", now).remaining).toBe(0);
    expect(limiter.check("ip-a", now + 500).remaining).toBe(0);
    expect(limiter.check("ip-a", now + 1500).remaining).toBe(0);
  });

  it("evicts oldest buckets when maxKeys is exceeded", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 10,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 3,
    });

    const now = Date.now();
    limiter.check("ip-1", now);
    limiter.check("ip-2", now + 1);
    limiter.check("ip-3", now + 2);

    // ip-1 is the oldest and should be evicted when ip-4 is added.
    limiter.check("ip-4", now + 3);

    // ip-1 was evicted, so it gets a fresh bucket with capacity - 1 = 9 remaining.
    const first = limiter.check("ip-1", now + 4);
    expect(first.remaining).toBe(9);
  });
});
