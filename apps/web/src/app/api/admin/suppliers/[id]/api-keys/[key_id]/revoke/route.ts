export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string; key_id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, key_id } = await params
    return await proxyRequest(request, `/api/v1/admin/suppliers/${encodeURIComponent(id)}/api-keys/${encodeURIComponent(key_id)}/revoke`, {
      method: 'POST',
      body: await request.text(),
    })
  } catch (error) {
    console.error('Admin supplier api-keys revoke POST proxy failed:', error)
    return NextResponse.json({ error: 'supplier_api_keys_revoke_proxy_failed' }, { status: 502 })
  }
}
