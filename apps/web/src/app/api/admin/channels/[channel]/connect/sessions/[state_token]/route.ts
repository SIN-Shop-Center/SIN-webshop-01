export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ channel: string; state_token: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { channel, state_token } = await params
    return await proxyRequest(
      request,
      `/api/v1/admin/channels/${encodeURIComponent(channel)}/connect/sessions/${encodeURIComponent(state_token)}`,
    )
  } catch (error) {
    console.error('Admin channel connect session proxy failed:', error)
    return NextResponse.json({ error: 'channel_connect_session_proxy_failed' }, { status: 502 })
  }
}
