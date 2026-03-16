import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from './base-url'
import { applyRateLimit, resolveRateLimitRule, toRetryAfterSeconds } from './proxy-rate-limit'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

const FORWARDED_RESPONSE_HEADERS = new Set([
  'cache-control',
  'content-type',
  'deprecation',
  'etag',
  'last-modified',
  'location',
  'retry-after',
  'sunset',
  'vary',
  'x-request-id',
])

const REQUEST_TIMEOUT_MS = 15_000

function requestIDFrom(req: NextRequest): string {
  const existing = req.headers.get('x-request-id')?.trim()
  return existing || crypto.randomUUID()
}

function cacheControlFor(targetPath: string, method: string, status: number): string {
  if (method.toUpperCase() !== 'GET') {
    return 'private, no-store'
  }
  if (status >= 400) {
    return 'private, no-store'
  }

  if (targetPath === '/api/v1/catalog/products' || targetPath.startsWith('/api/v1/catalog/products/')) {
    return 'public, max-age=30, s-maxage=120, stale-while-revalidate=300'
  }
  if (targetPath === '/api/v1/catalog/categories' || targetPath === '/api/v1/promotions/active') {
    return 'public, max-age=60, s-maxage=180, stale-while-revalidate=300'
  }

  return 'private, no-store'
}

function applyResponseSecurityHeaders(headers: Headers) {
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
}

function forwardHeaders(req: NextRequest): Headers {
  const headers = new Headers()

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      return
    }
    headers.set(key, value)
  })

  return headers
}

type ProxyOptions = {
  method?: string
  body?: BodyInit
}

function configErrorResponse(requestID: string, reason: string): NextResponse {
  const headers = new Headers({
    'content-type': 'application/json',
    'cache-control': 'private, no-store',
    'x-request-id': requestID,
  })
  applyResponseSecurityHeaders(headers)

  return NextResponse.json(
    {
      error: 'api_proxy_config_invalid',
      reason,
      request_id: requestID,
    },
    {
      status: 503,
      headers,
    },
  )
}

export async function proxyRequest(
  req: NextRequest,
  targetPath: string,
  options?: ProxyOptions,
): Promise<NextResponse> {
  const requestID = requestIDFrom(req)
  let base = ''
  try {
    base = getApiBaseUrl()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'api_base_url_invalid'
    return configErrorResponse(requestID, reason)
  }
  const target = new URL(`${base}${targetPath}`)
  const incoming = new URL(req.url)
  target.search = incoming.search

  const method = options?.method || req.method
  const rateLimitRule = resolveRateLimitRule(targetPath, method)
  const rateLimitResult = rateLimitRule ? applyRateLimit(req, rateLimitRule) : null
  if (rateLimitResult?.exceeded) {
    const headers = new Headers({
      'content-type': 'application/json',
      'retry-after': toRetryAfterSeconds(rateLimitResult.resetAt),
      'x-ratelimit-limit': String(rateLimitResult.limit),
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(rateLimitResult.resetAt),
    })
    applyResponseSecurityHeaders(headers)

    return NextResponse.json(
      {
        error: 'rate_limited',
        retry_after_seconds: rateLimitResult.retryAfterSeconds,
      },
      {
        status: 429,
        headers,
      },
    )
  }

  const headers = forwardHeaders(req)
  headers.set('x-forwarded-host', req.headers.get('host') || '')
  headers.set('x-request-id', requestID)

  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
  }

  if (options?.body !== undefined) {
    init.body = options.body
  } else if (!['GET', 'HEAD'].includes(method)) {
    init.body = await req.arrayBuffer()
  }

  const responseHeaders = new Headers()
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null
  const controller = new AbortController()
  timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  init.signal = controller.signal

  let upstream: Response
  try {
    upstream = await fetch(target, init)
  } catch (error) {
    const timeout = error instanceof Error && error.name === 'AbortError'
    const status = timeout ? 504 : 502

    responseHeaders.set('content-type', 'application/json')
    responseHeaders.set('cache-control', 'private, no-store')
    responseHeaders.set('x-request-id', requestID)
    if (timeout) {
      responseHeaders.set('retry-after', '1')
    }
    applyResponseSecurityHeaders(responseHeaders)

    return NextResponse.json(
      {
        error: timeout ? 'upstream_timeout' : 'upstream_unreachable',
        request_id: requestID,
      },
      {
        status,
        headers: responseHeaders,
      },
    )
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle)
    }
  }

  upstream.headers.forEach((value, key) => {
    if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value)
    }
  })

  if (!responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', cacheControlFor(targetPath, method, upstream.status))
  }

  if (rateLimitResult) {
    responseHeaders.set('x-ratelimit-limit', String(rateLimitResult.limit))
    responseHeaders.set('x-ratelimit-remaining', String(rateLimitResult.remaining))
    responseHeaders.set('x-ratelimit-reset', String(rateLimitResult.resetAt))
  }

  responseHeaders.set('x-request-id', requestID)
  applyResponseSecurityHeaders(responseHeaders)

  const body = await upstream.text()
  return new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
