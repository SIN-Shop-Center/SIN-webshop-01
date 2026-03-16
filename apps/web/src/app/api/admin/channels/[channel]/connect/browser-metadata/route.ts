export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ channel: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { channel } = await params
    return await proxyRequest(request, `/api/v1/admin/channels/${encodeURIComponent(channel)}/connect/browser-metadata`, {
      method: 'POST',
    })
  } catch (error) {
    console.error('Admin channel connect browser metadata proxy failed:', error)
    return NextResponse.json({ error: 'channel_connect_browser_metadata_proxy_failed' }, { status: 502 })
  }
}
