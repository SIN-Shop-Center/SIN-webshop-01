export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ugc/posting-queue/claim', { method: 'POST' })
  } catch (error) {
    console.error('Admin UGC posting queue claim proxy failed:', error)
    return NextResponse.json({ error: 'ugc_posting_queue_claim_proxy_failed' }, { status: 502 })
  }
}
