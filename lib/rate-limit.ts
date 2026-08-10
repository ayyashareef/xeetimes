// Per-IP rate limiting for the public write endpoints.
//
// Turnstile is the intended defence, but verifyTurnstile() returns true when
// TURNSTILE_SECRET_KEY is unset — so with no keys configured the comment form
// has been completely open, which is how the casino spam reached the moderation
// queue. This works with no keys and no external service, and stays useful as a
// second layer once Turnstile is switched on.
//
// State is in-process, which is correct here: pm2 runs a single fork of the app.
// Move this to Redis before running more than one instance.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();
// Bound the map so a flood of spoofed X-Forwarded-For values cannot grow it
// without limit. Well past the number of real visitors in any window.
const MAX_KEYS = 20_000;

function sweep(now: number) {
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  if (buckets.size > MAX_KEYS) {
    // Still oversized after expiry: drop the oldest-expiring half.
    const sorted = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (let i = 0; i < sorted.length / 2; i++) buckets.delete(sorted[i][0]);
  }
}

/** The client IP as seen behind Cloudflare + nginx. */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Returns null when the request may proceed, or the seconds to wait when it may
 * not. `name` scopes the bucket so a comment and a contact message do not share
 * an allowance.
 */
export function rateLimit(
  request: Request,
  name: string,
  limit: number,
  windowMs: number,
): number | null {
  const now = Date.now();
  if (buckets.size > 500) sweep(now);

  const key = `${name}:${clientIp(request)}`;
  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (hit.count >= limit) return Math.ceil((hit.resetAt - now) / 1000);

  hit.count += 1;
  return null;
}
