/**
 * Rate limiting best-effort por instancia (memoria).
 * En serverless cada instancia tiene su propio contador — esto mitiga
 * abuso básico (spam de formularios) pero NO sustituye un WAF.
 * Para límite duro global: Upstash Redis o el rate limiting de Netlify.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number } = { limit: 10, windowMs: 60_000 }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.limit - 1 };
  }

  bucket.count++;
  if (bucket.count > opts.limit) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: opts.limit - bucket.count };
}

/** Limpia buckets viejos para no crecer sin límite en instancias calientes. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 300_000).unref?.();
