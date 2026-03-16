export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsEventSchema } from '@simone/contracts'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest) {
  let event: unknown
  try {
    event = AnalyticsEventSchema.parse(await request.json())
  } catch (error) {
    console.error('analytics_ingest_failed', error)
    return NextResponse.json({ error: 'invalid_analytics_payload' }, { status: 400 })
  }

  try {
    const response = await proxyRequest(request, '/api/v1/analytics/events', {
      method: 'POST',
      body: JSON.stringify(event),
    })

    // Analytics is best-effort. Upstream outages must not surface as browser-visible 5xx.
    if (response.status >= 500) {
      const requestID = response.headers.get('x-request-id') || crypto.randomUUID()
      console.warn('analytics_upstream_unavailable', { request_id: requestID, status: response.status })
      return NextResponse.json(
        {
          accepted: true,
          degraded: true,
          request_id: requestID,
        },
        {
          status: 202,
          headers: {
            'cache-control': 'private, no-store',
            'x-request-id': requestID,
          },
        },
      )
    }

    return response
  } catch (error) {
    const requestID = crypto.randomUUID()
    console.warn('analytics_proxy_failed', { request_id: requestID, error: String(error) })
    return NextResponse.json(
      {
        accepted: true,
        degraded: true,
        request_id: requestID,
      },
      {
        status: 202,
        headers: {
          'cache-control': 'private, no-store',
          'x-request-id': requestID,
        },
      },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    route: 'analytics',
    endpoints: ['/api/analytics/funnel', '/api/analytics/alerts', '/api/analytics/experiments'],
  })
}
