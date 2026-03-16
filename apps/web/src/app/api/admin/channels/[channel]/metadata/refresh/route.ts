export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

interface RouteParams {
  params: Promise<{ channel: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { channel } = await params
    return await proxyRequest(request, `/api/v1/admin/channels/${encodeURIComponent(channel)}/metadata/refresh`, {
      method: 'POST',
    })
  } catch (error) {
    console.error('Admin channel metadata refresh proxy failed:', error)
    return NextResponse.json({ error: 'channel_metadata_refresh_proxy_failed' }, { status: 502 })
  }
}
