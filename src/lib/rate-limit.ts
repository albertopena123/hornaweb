// Rate-limit in-memory por proceso (suficiente para una sola instancia; el
// login usa el mismo enfoque). scope separa contadores por endpoint.
type Bucket = { count: number; resetAt: number }

const scopes = new Map<string, Map<string, Bucket>>()

export function rateLimit(
  scope: string,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  let buckets = scopes.get(scope)
  if (!buckets) {
    buckets = new Map()
    scopes.set(scope, buckets)
  }
  // GC ocasional de buckets vencidos
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (b.count < max) {
    b.count += 1
    return { allowed: true, retryAfterSec: 0 }
  }
  return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
}
