// Purpose: Application-Layer Rate-Limiting (Defense in Depth zur Cloudflare WAF)
// Docs: Issue #41 — Rate-Limiting auf Auth/Cart/Contact
//
// Identifiers: IP (cf-connecting-ip) + Action-Name (z.B. 'login', 'contact').
// Storage: Cloudflare Workers KV (Binding RATE_LIMIT_KV) mit In-Memory-Fallback
// für Dev/CI.
//
// Bewusst KEIN @upstash/ratelimit — wir haben bereits CF KV und vermeiden
// Extra-Dependencies.
//
// WICHTIG: next/headers wird dynamisch importiert, damit das Modul
// auch in Client Components importierbar ist (nur die Funktionen, die
// es brauchen, holen sich den IP-Server-side). Auf dem Client ist
// `checkRateLimit` ein no-op (Rate-Limit greift dann via CF WAF).

export class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super('Zu viele Anfragen. Bitte später erneut versuchen.')
  }
}

type Bucket = { count: number; resetAt: number }

const memory = new Map<string, Bucket>()

interface KvLike {
  get(key: string, type: 'json'): Promise<Bucket | null>
  put(
    key: string,
    value: string,
    opts: { expirationTtl: number },
  ): Promise<unknown>
}

function getKv(): KvLike | null {
  return (globalThis as { RATE_LIMIT_KV?: KvLike }).RATE_LIMIT_KV ?? null
}

async function getClientIp(): Promise<string> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return (
      h.get('cf-connecting-ip') ??
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'
    )
  } catch {
    // Auf dem Client: 'client' als Marker — sollte hier gar nicht landen,
    // weil die echten Limiter Server-Side laufen.
    return 'client'
  }
}

export async function checkRateLimit(
  action: string,
  opts: { limit: number; windowSec: number },
): Promise<void> {
  const ip = await getClientIp()
  const key = `rl:${action}:${ip}`
  const now = Date.now()

  const kv = getKv()
  const bucket = kv
    ? await kv.get(key, 'json')
    : memory.get(key) ?? null

  if (!bucket || bucket.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowSec * 1000 }
    if (kv) {
      await kv.put(key, JSON.stringify(fresh), {
        expirationTtl: opts.windowSec,
      })
    } else {
      memory.set(key, fresh)
    }
    return
  }

  if (bucket.count >= opts.limit) {
    throw new RateLimitError(bucket.resetAt - now)
  }

  bucket.count++
  const ttl = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
  if (kv) {
    await kv.put(key, JSON.stringify(bucket), { expirationTtl: ttl })
  } else {
    memory.set(key, bucket)
  }
}
