export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string; contract_id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, contract_id } = await params
    return await proxyRequest(request, `/api/v1/admin/suppliers/${encodeURIComponent(id)}/contracts/${encodeURIComponent(contract_id)}/download-url`)
  } catch (error) {
    console.error('Admin supplier contracts download-url GET proxy failed:', error)
    return NextResponse.json({ error: 'supplier_contracts_download_url_proxy_failed' }, { status: 502 })
  }
}
