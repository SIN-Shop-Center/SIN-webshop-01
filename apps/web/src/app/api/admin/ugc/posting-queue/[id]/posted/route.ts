export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    return await proxyRequest(request, `/api/v1/admin/ugc/posting-queue/${encodeURIComponent(context.params.id)}/posted`, { method: 'POST' })
  } catch (error) {
    console.error('Admin UGC posting queue posted proxy failed:', error)
    return NextResponse.json({ error: 'ugc_posting_queue_posted_proxy_failed' }, { status: 502 })
  }
}
