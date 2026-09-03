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

  it("evicts least-recently-active buckets once past the eviction threshold", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 10,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 3,
    });

    const now = Date.now();
    // Eviction is amortized: the map is allowed 10% headroom over maxKeys
    // before a batch is dropped, so it takes more than maxKeys+1 keys to
    // trigger. Add enough to cross the threshold.
    limiter.check("ip-1", now);
    limiter.check("ip-2", now + 1);
    limiter.check("ip-3", now + 2);
    limiter.check("ip-4", now + 3);
    limiter.check("ip-5", now + 4);

    // Oldest goes first: ip-1 was evicted, so it gets a fresh full bucket.
    expect(limiter.check("ip-1", now + 5).remaining).toBe(9);

    // The most recent key kept its partially-spent bucket.
    expect(limiter.check("ip-5", now + 6).remaining).toBe(8);
  });
});

describe("memory bounds", () => {
  it("keeps the bucket map bounded under key flooding", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 50,
    });

    for (let i = 0; i < 5000; i++) limiter.check(`ip-${i}`, 1_000_000 + i);

    // Bounded by maxKeys plus the 10% eviction headroom.
    expect(limiter.size).toBeLessThanOrEqual(55);
  });

  it("recreates an evicted bucket at full capacity (fails open, never locks out)", () => {
    const limiter = new TokenBucketRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
      windowSeconds: 60,
      maxKeys: 10,
    });

    limiter.check("victim", 1_000_000);
    for (let i = 0; i < 500; i++) limiter.check(`flood-${i}`, 2_000_000 + i);

    const after = limiter.check("victim", 3_000_000);
    expect(after.ok).toBe(true);
  });
});
