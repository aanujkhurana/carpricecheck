// In-process rate limiter for MVP. Designed to be good enough against casual
// abuse without bringing in a Redis dependency. For production traffic, replace
// with Upstash Ratelimit or a Postgres-backed bucket.
//
// Each bucket is keyed by an identifier (e.g. IP) and expires after `windowMs`.
// Memory is bounded by lazy pruning on each access.

type Bucket = { count: number; resetAt: number };

const STORE_LIMIT = 10_000; // hard cap on stored buckets
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Lazy prune if we've grown too large; drop expired entries.
  if (buckets.size > STORE_LIMIT) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, retryAfterMs: 0 };
}
