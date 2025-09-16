// ==== [API] rate limiter (STRICT120, in-memory dev impl) ====
const buckets = new Map<string, { tokens: number; updatedAt: number }>();

export type RateKey = { key: string; limit: number; windowMs: number };

export function rateLimitConsume(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cap = limit;
  const refillPerMs = cap / windowMs;

  const bucket = buckets.get(key) || { tokens: cap, updatedAt: now };
  const elapsed = Math.max(0, now - bucket.updatedAt);
  const tokens = Math.min(cap, bucket.tokens + elapsed * refillPerMs);

  const allowed = tokens >= 1;
  const nextTokens = Math.max(0, allowed ? tokens - 1 : tokens);
  buckets.set(key, { tokens: nextTokens, updatedAt: now });

  return { allowed, remaining: Math.floor(nextTokens), limit: cap, resetMs: windowMs };
}

export function rateKey(ip: string, bucket: string) {
  return `${bucket}:${ip}`;
}
