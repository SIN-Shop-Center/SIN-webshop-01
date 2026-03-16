export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    return await proxyRequest(request, `/api/v1/admin/ugc/jobs/${encodeURIComponent(context.params.id)}`)
  } catch (error) {
    console.error('Admin UGC job detail GET proxy failed:', error)
    return NextResponse.json({ error: 'ugc_job_detail_proxy_failed' }, { status: 502 })
  }
}
