export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/suppliers/catalog-sync/callback')
  } catch (error) {
    console.error('Admin supplier catalog sync callback proxy failed:', error)
    return NextResponse.json({ error: 'supplier_catalog_sync_callback_proxy_failed' }, { status: 502 })
  }
}
