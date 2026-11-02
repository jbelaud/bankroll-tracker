// Garde-fou par IP pour les endpoints publics (sans session). Le compteur est
// en mémoire : il borne l'abus au sein d'une instance, la protection DDoS
// globale reste celle du pare-feu de l'hébergeur (voir docs/hosting-hardening.md).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5_000;

export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip")?.trim()
    || headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export function checkIpRateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: { limit: number; windowMs: number; now?: number },
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  bucket.count += 1;
  return { allowed: true };
}

export function resetIpRateLimitsForTests() {
  buckets.clear();
}
