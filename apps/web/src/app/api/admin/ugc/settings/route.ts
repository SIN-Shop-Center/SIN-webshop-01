export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function GET(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/settings')
  } catch (error) {
    console.error('Admin UGC settings GET proxy failed:', error)
    return NextResponse.json({ error: 'ugc_settings_proxy_failed' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/settings')
  } catch (error) {
    console.error('Admin UGC settings PUT proxy failed:', error)
    return NextResponse.json({ error: 'ugc_settings_update_proxy_failed' }, { status: 502 })
  }
}
