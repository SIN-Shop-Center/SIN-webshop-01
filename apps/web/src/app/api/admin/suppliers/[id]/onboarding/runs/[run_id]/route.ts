export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string; run_id: string }>
}

async function targetPath(params: Promise<{ id: string; run_id: string }>): Promise<string> {
  const { id, run_id: runID } = await params
  return `/api/v1/admin/suppliers/${encodeURIComponent(id)}/onboarding/runs/${encodeURIComponent(runID)}`
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin supplier onboarding run GET proxy failed:', error)
    return NextResponse.json({ error: 'supplier_onboarding_run_proxy_failed' }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin supplier onboarding run PATCH proxy failed:', error)
    return NextResponse.json({ error: 'supplier_onboarding_run_proxy_failed' }, { status: 502 })
  }
}

