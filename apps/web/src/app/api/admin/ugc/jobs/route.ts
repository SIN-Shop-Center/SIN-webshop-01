export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function GET(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/jobs')
  } catch (error) {
    console.error('Admin UGC jobs GET proxy failed:', error)
    return NextResponse.json({ error: 'ugc_jobs_proxy_failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/jobs')
  } catch (error) {
    console.error('Admin UGC jobs POST proxy failed:', error)
    return NextResponse.json({ error: 'ugc_job_create_proxy_failed' }, { status: 502 })
  }
}
