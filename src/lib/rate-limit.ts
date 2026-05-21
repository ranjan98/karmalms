/**
 * In-memory sliding-window rate limiter.
 *
 * State is per process — correct for a single-instance self-hosted
 * deployment (KarmaLMS's model). A multi-instance deployment behind a load
 * balancer would need a shared store (Redis); the interface stays the same.
 */
const buckets = new Map<string, number[]>();

/** Returns true if the call is allowed, false if the limit is exceeded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);
  return true;
}
