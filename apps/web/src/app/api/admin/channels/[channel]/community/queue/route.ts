export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ channel: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { channel } = await params
    return await proxyRequest(request, `/api/v1/admin/channels/${encodeURIComponent(channel)}/community/queue`)
  } catch (error) {
    console.error('Admin channel community queue proxy failed:', error)
    return NextResponse.json({ error: 'channel_community_queue_proxy_failed' }, { status: 502 })
  }
}
