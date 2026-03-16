export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function targetPath(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params
  return `/api/v1/admin/suppliers/${encodeURIComponent(id)}/catalog-products`
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin supplier catalog-products GET proxy failed:', error)
    return NextResponse.json({ error: 'supplier_catalog_products_proxy_failed' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin supplier catalog-products PUT proxy failed:', error)
    return NextResponse.json({ error: 'supplier_catalog_products_proxy_failed' }, { status: 502 })
  }
}
