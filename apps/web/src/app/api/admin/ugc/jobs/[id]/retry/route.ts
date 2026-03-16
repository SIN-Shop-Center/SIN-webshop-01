export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    return await proxyRequest(request, `/api/v1/admin/ugc/jobs/${encodeURIComponent(context.params.id)}/retry`, { method: 'POST' })
  } catch (error) {
    console.error('Admin UGC retry POST proxy failed:', error)
    return NextResponse.json({ error: 'ugc_job_retry_proxy_failed' }, { status: 502 })
  }
}
