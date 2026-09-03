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

  constructor(private config: TokenBucketConfig = DEFAULT_CONFIG) {}

  /**
   * Check a request against the limiter.
   * @param key - unique key (usually IP address or a hashed identifier)
   */
  private purgeOldestIfNeeded(maxKeys: number): void {
    if (this.buckets.size <= maxKeys) return;

    const entries = Array.from(this.buckets.entries());
    // Sort by most recent activity first.
    entries.sort((a, b) => b[1].lastRefill - a[1].lastRefill);
    const keep = new Set(entries.slice(0, maxKeys).map(([k]) => k));
    for (const k of this.buckets.keys()) {
      if (!keep.has(k)) {
        this.buckets.delete(k);
      }
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

export const defaultRateLimiter = new TokenBucketRateLimiter();
