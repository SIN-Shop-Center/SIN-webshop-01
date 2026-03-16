import type { NextRequest } from 'next/server'

type RateLimitRule = {
  id: string
  pathPrefix: string
  methods: string[]
  max: number
  windowMs: number
}

type RateLimitState = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
  exceeded: boolean
}

const RATE_LIMIT_RULES: RateLimitRule[] = [
  { id: 'catalog-read', pathPrefix: '/api/v1/catalog/', methods: ['GET'], max: 240, windowMs: 60_000 },
  { id: 'promotions-read', pathPrefix: '/api/v1/promotions/active', methods: ['GET'], max: 180, windowMs: 60_000 },
  { id: 'analytics-events', pathPrefix: '/api/v1/analytics/events', methods: ['POST'], max: 90, windowMs: 60_000 },
  { id: 'checkout-create', pathPrefix: '/api/v1/checkout/session', methods: ['POST'], max: 20, windowMs: 60_000 },
  { id: 'checkout-status', pathPrefix: '/api/v1/checkout/session-status', methods: ['GET'], max: 120, windowMs: 60_000 },
  { id: 'support-tickets', pathPrefix: '/api/v1/support/tickets', methods: ['POST'], max: 20, windowMs: 60_000 },
  { id: 'ai-chat', pathPrefix: '/api/v1/ai/chat', methods: ['POST'], max: 30, windowMs: 60_000 },
]

declare global {
  // eslint-disable-next-line no-var
  var __simoneRateLimitStore: Map<string, RateLimitState> | undefined
}

const rateLimitStore = globalThis.__simoneRateLimitStore ?? new Map<string, RateLimitState>()
globalThis.__simoneRateLimitStore = rateLimitStore

function clientAddress(req: NextRequest): string {
  const raw = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  return raw.split(',')[0]?.trim() || 'unknown'
}

export function resolveRateLimitRule(targetPath: string, method: string): RateLimitRule | null {
  if (process.env.NEXT_PUBLIC_DISABLE_WEB_RATE_LIMITS === 'true') {
    return null
  }
  const normalizedMethod = method.toUpperCase()
  for (const rule of RATE_LIMIT_RULES) {
    if (targetPath.startsWith(rule.pathPrefix) && rule.methods.includes(normalizedMethod)) {
      return rule
    }
  }
  return null
}

export function applyRateLimit(req: NextRequest, rule: RateLimitRule): RateLimitResult {
  const now = Date.now()
  const key = `${rule.id}:${clientAddress(req)}`
  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    const resetAt = now + rule.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return { limit: rule.max, remaining: Math.max(rule.max - 1, 0), resetAt, retryAfterSeconds: Math.ceil(rule.windowMs / 1000), exceeded: false }
  }

  if (current.count >= rule.max) {
    return { limit: rule.max, remaining: 0, resetAt: current.resetAt, retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1), exceeded: true }
  }

  current.count += 1
  rateLimitStore.set(key, current)
  return { limit: rule.max, remaining: Math.max(rule.max - current.count, 0), resetAt: current.resetAt, retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1), exceeded: false }
}

export function toRetryAfterSeconds(resetAt: number): string {
  return String(Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1))
}
