export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function targetPath(params: Promise<{ id: string }>, request: NextRequest): Promise<string> {
  const { id } = await params
  const query = request.nextUrl.searchParams.toString()
  const base = '/api/v1/admin/suppliers/' + encodeURIComponent(id) + '/performance'
  return query ? `${base}?${query}` : base
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params, request))
  } catch (error) {
    console.error('Admin supplier performance GET proxy failed:', error)
    return NextResponse.json({ error: 'supplier_performance_proxy_failed' }, { status: 502 })
  }
}
