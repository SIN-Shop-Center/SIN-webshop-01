export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    return await proxyRequest(request, `/api/v1/admin/suppliers/${encodeURIComponent(id)}/contracts/presign`, {
      method: 'POST',
      body: await request.text(),
    })
  } catch (error) {
    console.error('Admin supplier contracts presign POST proxy failed:', error)
    return NextResponse.json({ error: 'supplier_contracts_presign_proxy_failed' }, { status: 502 })
  }
}
