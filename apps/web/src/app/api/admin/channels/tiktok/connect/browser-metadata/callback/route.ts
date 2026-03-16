export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

export async function POST(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/channels/tiktok/connect/browser-metadata/callback')
  } catch (error) {
    console.error('TikTok connect browser metadata callback proxy failed:', error)
    return NextResponse.json({ error: 'tiktok_connect_browser_metadata_callback_proxy_failed' }, { status: 502 })
  }
}
