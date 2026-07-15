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

/**
 * Rate limit DISTRIBUIDO: cuenta compartida entre instancias serverless vía
 * Upstash Redis REST (INCR + EXPIRE atómicos, sin dependencia — solo fetch).
 * Si no hay UPSTASH_REDIS_REST_URL/TOKEN configurados (dev), cae al limitador
 * en memoria. Misma firma de retorno que rateLimit para no tocar los callers.
 */
export async function rateLimitDistributed(
  key: string,
  opts: { limit: number; windowMs: number } = { limit: 10, windowMs: 60_000 }
): Promise<{ allowed: boolean; remaining: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimit(key, opts);

  const windowSec = Math.ceil(opts.windowMs / 1000);
  try {
    // Pipeline atómico: INCR devuelve el conteo; en el primer hit fijamos TTL.
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", `rl:${key}`],
        ["EXPIRE", `rl:${key}`, String(windowSec), "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return rateLimit(key, opts);
    const data = (await res.json()) as Array<{ result: number }>;
    const count = data[0]?.result ?? 1;
    const allowed = count <= opts.limit;
    return { allowed, remaining: Math.max(0, opts.limit - count) };
  } catch {
    // Ante cualquier fallo del servicio, degradar al limitador local (no bloquear).
    return rateLimit(key, opts);
  }
}
