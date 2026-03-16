export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ id: string }>
}

async function targetPath(params: Promise<{ id: string }>): Promise<string> {
  const { id } = await params
  return `/api/v1/admin/crm/tasks/${encodeURIComponent(id)}`
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    return await proxyRequest(request, await targetPath(params))
  } catch (error) {
    console.error('Admin CRM task PATCH proxy failed:', error)
    return NextResponse.json({ error: 'crm_task_proxy_failed' }, { status: 502 })
  }
}

