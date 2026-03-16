export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function targetPath(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params
  return `/api/v1/admin/suppliers/${encodeURIComponent(id)}/catalog-products/sync`
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin supplier catalog sync POST proxy failed:', error)
    return NextResponse.json({ error: 'supplier_catalog_sync_proxy_failed' }, { status: 502 })
  }
}
