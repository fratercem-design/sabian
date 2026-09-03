/**
 * Simple in-memory token-bucket rate limiter.
 *
 * Production deployments on multiple serverless instances should replace this
 * with a shared store (Redis, Cloudflare D1/KV, etc.). For a single-node beta
 * or local use this provides per-IP protection against accidental abuse.
 */

export interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

interface TokenBucketConfig {
  capacity: number;
  refillPerSecond: number;
  windowSeconds: number;
  /** Maximum distinct buckets to retain. Prevents unbounded memory growth. */
  maxKeys: number;
}

const DEFAULT_CONFIG: TokenBucketConfig = {
  capacity: 60,
  refillPerSecond: 1,
  windowSeconds: 60,
  maxKeys: 10000,
};

export class TokenBucketRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  /** Number of tracked buckets. Exposed for memory-bound tests. */
  get size(): number {
    return this.buckets.size;
  }

  constructor(private config: TokenBucketConfig = DEFAULT_CONFIG) {}

  /**
   * Check a request against the limiter.
   * @param key - unique key (usually IP address or a hashed identifier)
   */
  /**
   * Bound memory when many distinct keys appear.
   *
   * Evicting exactly one entry per insertion would re-sort the whole map on
   * every request once at capacity — O(n log n) per request under precisely
   * the key-flooding this is meant to survive. Instead we let the map run
   * slightly over and then drop a batch, amortizing the sort across many
   * insertions.
   *
   * Eviction is fail-open: a dropped bucket is recreated full on the owner's
   * next request, so eviction never locks anyone out.
   */
  private purgeOldestIfNeeded(maxKeys: number): void {
    // Allow 10% headroom so the sort runs once per maxKeys/10 insertions.
    if (this.buckets.size <= maxKeys + Math.ceil(maxKeys / 10)) return;

    const entries = Array.from(this.buckets.entries());
    // Sort by most recent activity first, keep the freshest maxKeys.
    entries.sort((a, b) => b[1].lastRefill - a[1].lastRefill);
    for (const [k] of entries.slice(maxKeys)) {
      this.buckets.delete(k);
    }
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const { capacity, refillPerSecond, windowSeconds, maxKeys } = this.config;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      this.buckets.set(key, bucket);
      this.purgeOldestIfNeeded(maxKeys);
    } else {
      const elapsed = (now - bucket.lastRefill) / 1000;
      const tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerSecond);
      bucket.tokens = tokens;
      bucket.lastRefill = now;
    }

    const ok = bucket.tokens >= 1;
    if (ok) {
      // consume one token
      bucket.tokens -= 1;
    }

    return {
      ok,
      remaining: Math.max(0, Math.floor(bucket.tokens)),
      reset: Math.ceil(now / 1000 + windowSeconds),
      limit: capacity,
    };
  }
}

/** Per-client limiter, used when a trusted client identity is available. */
export const defaultRateLimiter = new TokenBucketRateLimiter();

/**
 * Global ceiling used when no trusted client identity exists.
 *
 * Every such request shares one key, so this is a whole-deployment circuit
 * breaker rather than a per-client limit. Capacity is deliberately high: the
 * goal is to bound catastrophic abuse without throttling all legitimate users
 * down to a single client's allowance.
 */
export const untrustedFallbackLimiter = new TokenBucketRateLimiter({
  capacity: 600,
  refillPerSecond: 10,
  windowSeconds: 60,
  maxKeys: 8,
});
