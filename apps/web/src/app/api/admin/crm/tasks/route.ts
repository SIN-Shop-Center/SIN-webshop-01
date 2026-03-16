export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function GET(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/crm/tasks')
  } catch (error) {
    console.error('Admin CRM tasks GET proxy failed:', error)
    return NextResponse.json({ error: 'crm_tasks_proxy_failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/crm/tasks')
  } catch (error) {
    console.error('Admin CRM tasks POST proxy failed:', error)
    return NextResponse.json({ error: 'crm_tasks_proxy_failed' }, { status: 502 })
  }
}

