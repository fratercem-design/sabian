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
}

const DEFAULT_CONFIG: TokenBucketConfig = {
  capacity: 60,
  refillPerSecond: 1,
  windowSeconds: 60,
};

export class TokenBucketRateLimiter {
  private buckets = new Map<string, RateLimitBucket>();

  constructor(private config: TokenBucketConfig = DEFAULT_CONFIG) {}

  /**
   * Check a request against the limiter.
   * @param key - unique key (usually IP address or a hashed identifier)
   */
  check(key: string, now = Date.now()): RateLimitResult {
    const { capacity, refillPerSecond, windowSeconds } = this.config;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      this.buckets.set(key, bucket);
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
