export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function GET(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/posting-queue')
  } catch (error) {
    console.error('Admin UGC posting queue GET proxy failed:', error)
    return NextResponse.json({ error: 'ugc_posting_queue_proxy_failed' }, { status: 502 })
  }
}
