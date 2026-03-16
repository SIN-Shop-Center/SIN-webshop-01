export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { harvestTikTokBrowserMetadata, validateTikTokAutomationToken } from '@/lib/automation/tiktok-shop-browser'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-simone-internal-token')?.trim() || ''
  if (!validateTikTokAutomationToken(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  try {
    const result = await harvestTikTokBrowserMetadata({
      target_url: String(body.target_url || '').trim(),
      current_url: String(body.current_url || '').trim(),
      candidate_urls: body.candidate_urls,
      browser_session_ref: String(body.browser_session_ref || '').trim(),
      html: String(body.html || '').trim(),
      title: String(body.title || '').trim(),
      extracted:
        typeof body.extracted === 'object' && body.extracted !== null
          ? (body.extracted as Record<string, unknown>)
          : typeof body.request_payload === 'object' && body.request_payload !== null
            ? (((body.request_payload as Record<string, unknown>).extracted as Record<string, unknown> | undefined) || {})
            : {},
      metadata:
        typeof body.metadata === 'object' && body.metadata !== null
          ? (body.metadata as Record<string, unknown>)
          : typeof body.request_payload === 'object' && body.request_payload !== null
            ? (body.request_payload as Record<string, unknown>)
            : {},
      available_shops:
        body.available_shops ??
        (typeof body.request_payload === 'object' && body.request_payload !== null ? (body.request_payload as Record<string, unknown>).available_shops : undefined),
      shops: body.shops ?? (typeof body.request_payload === 'object' && body.request_payload !== null ? (body.request_payload as Record<string, unknown>).shops : undefined),
      browser_recipe: typeof body.browser_recipe === 'object' && body.browser_recipe !== null ? (body.browser_recipe as Record<string, unknown>) : {},
      request_payload: typeof body.request_payload === 'object' && body.request_payload !== null ? (body.request_payload as Record<string, unknown>) : {},
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('TikTok browser metadata harvest failed:', error)
    return NextResponse.json({ error: 'tiktok_browser_metadata_harvest_failed' }, { status: 502 })
  }
}
