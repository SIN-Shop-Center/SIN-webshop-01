import { NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/api/base-url'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()

  let apiBaseUrl = ''
  try {
    apiBaseUrl = getApiBaseUrl()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'api_base_url_invalid'
    const apiState = reason === 'api_base_url_missing' ? 'config_missing' : 'config_invalid'

    return NextResponse.json(
      {
        status: 'degraded',
        web: 'ok',
        api: apiState,
        error: reason,
      },
      { status: 503 },
    )
  }

  try {
    const response = await fetch(`${apiBaseUrl}/ready`, {
      method: 'GET',
      cache: 'no-store',
    })

    const durationMs = Date.now() - startedAt
    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        {
          status: typeof payload?.status === 'string' ? payload.status : 'degraded',
          web: 'ok',
          api: 'unhealthy',
          latency_ms: durationMs,
          upstream_status: response.status,
          upstream: payload,
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      status: typeof payload?.status === 'string' ? payload.status : 'ok',
      web: 'ok',
      api: 'ok',
      latency_ms: durationMs,
      upstream_status: response.status,
      upstream: payload,
    })
  } catch (error) {
    console.error('Health proxy failed:', error)
    return NextResponse.json(
      {
        status: 'degraded',
        web: 'ok',
        api: 'unreachable',
      },
      { status: 503 },
    )
  }
}
