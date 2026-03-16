export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'
import { allowCatalogApiFallback, catalogCategoriesFallback } from '@/lib/server/catalog-api-fallback'

export async function GET(request: NextRequest) {
  if (allowCatalogApiFallback() && !String(process.env.INTERNAL_API_URL || '').trim()) {
    return NextResponse.json(catalogCategoriesFallback(), {
      status: 200,
      headers: {
        'cache-control': 'private, no-store',
        'x-fallback-source': 'catalog-categories',
      },
    })
  }

  try {
    const response = await proxyRequest(request, '/api/v1/catalog/categories')
    if (response.status >= 500 && allowCatalogApiFallback()) {
      return NextResponse.json(catalogCategoriesFallback(), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-categories',
        },
      })
    }
    return response
  } catch (error) {
    console.error('Categories proxy failed:', error)
    if (allowCatalogApiFallback()) {
      return NextResponse.json(catalogCategoriesFallback(), {
        status: 200,
        headers: {
          'cache-control': 'private, no-store',
          'x-fallback-source': 'catalog-categories',
        },
      })
    }
    return NextResponse.json({ error: 'categories_proxy_failed' }, { status: 502 })
  }
}
