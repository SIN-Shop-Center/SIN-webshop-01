export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'
import { allowCatalogApiFallback, catalogProductsFallback } from '@/lib/server/catalog-api-fallback'

export async function GET(request: NextRequest) {
  if (allowCatalogApiFallback() && !String(process.env.INTERNAL_API_URL || '').trim()) {
    return NextResponse.json(catalogProductsFallback(request.nextUrl.searchParams), {
      status: 200,
      headers: {
        'cache-control': 'private, no-store',
        'x-fallback-source': 'catalog-products',
      },
    })
  }

  try {
    const response = await proxyRequest(request, '/api/v1/catalog/products')
    if (response.status >= 500 && allowCatalogApiFallback()) {
      return NextResponse.json(catalogProductsFallback(request.nextUrl.searchParams), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-products',
        },
      })
    }
    return response
  } catch (error) {
    console.error('Catalog proxy failed:', error)
    if (allowCatalogApiFallback()) {
      return NextResponse.json(catalogProductsFallback(request.nextUrl.searchParams), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-products',
        },
      })
    }
    return NextResponse.json({ error: 'catalog_proxy_failed' }, { status: 502 })
  }
}
