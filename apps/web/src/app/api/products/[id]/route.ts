export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'
import { allowCatalogApiFallback, catalogProductFallback } from '@/lib/server/catalog-api-fallback'

type Params = {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const productId = encodeURIComponent(params.id)
    const response = await proxyRequest(request, `/api/v1/catalog/products/${productId}`)
    if (response.status >= 500 && allowCatalogApiFallback()) {
      const fallback = catalogProductFallback(params.id)
      if (!fallback) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-product-detail',
        },
      })
    }
    return response
  } catch (error) {
    console.error('Product detail proxy failed:', error)
    if (allowCatalogApiFallback()) {
      const fallback = catalogProductFallback(params.id)
      if (!fallback) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      return NextResponse.json(fallback, {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-product-detail',
        },
      })
    }
    return NextResponse.json({ error: 'product_detail_proxy_failed' }, { status: 502 })
  }
}
