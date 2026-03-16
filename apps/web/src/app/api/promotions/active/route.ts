export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'
import { allowCatalogApiFallback, promotionsFallback } from '@/lib/server/catalog-api-fallback'

export async function GET(request: NextRequest) {
  if (allowCatalogApiFallback() && !String(process.env.INTERNAL_API_URL || '').trim()) {
    return NextResponse.json(promotionsFallback(request.nextUrl.searchParams), {
      status: 200,
      headers: {
        'cache-control': 'private, no-store',
        'x-fallback-source': 'promotions-active',
      },
    })
  }

  try {
    const response = await proxyRequest(request, '/api/v1/promotions/active')
    if (response.status >= 500 && allowCatalogApiFallback()) {
      return NextResponse.json(promotionsFallback(request.nextUrl.searchParams), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'promotions-active',
        },
      })
    }
    return response
  } catch (error) {
    console.error('Promotions active proxy failed:', error)
    if (allowCatalogApiFallback()) {
      return NextResponse.json(promotionsFallback(request.nextUrl.searchParams), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'promotions-active',
        },
      })
    }
    return NextResponse.json({ error: 'promotions_active_proxy_failed' }, { status: 502 })
  }
}
