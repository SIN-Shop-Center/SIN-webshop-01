export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function targetPath(params: Promise<{ id: string }>, request: NextRequest): Promise<string> {
  const { id } = await params
  const query = request.nextUrl.searchParams.toString()
  const base = '/api/v1/admin/suppliers/' + encodeURIComponent(id) + '/contracts'
  return query ? `${base}?${query}` : base
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params, request))
  } catch (error) {
    console.error('Admin supplier contracts GET proxy failed:', error)
    return NextResponse.json({ error: 'supplier_contracts_proxy_failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params, request), {
      method: 'POST',
      body: await request.text(),
    })
  } catch (error) {
    console.error('Admin supplier contracts POST proxy failed:', error)
    return NextResponse.json({ error: 'supplier_contracts_proxy_failed' }, { status: 502 })
  }
}
