export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { syncTikTokCatalogViaBrowser } from '@/lib/automation/tiktok-shop-browser-actions'
import { validateTikTokAutomationToken } from '@/lib/automation/tiktok-shop-browser'

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
    const result = await syncTikTokCatalogViaBrowser({
      browser_session_ref: String(body.browser_session_ref || '').trim(),
      target_url: String(body.target_url || '').trim(),
      candidate_urls: body.candidate_urls,
      browser_recipe: typeof body.browser_recipe === 'object' && body.browser_recipe !== null ? (body.browser_recipe as Record<string, unknown>) : {},
      request_payload: typeof body.request_payload === 'object' && body.request_payload !== null ? (body.request_payload as Record<string, unknown>) : {},
      merchant_id: String(body.merchant_id || '').trim(),
      shop_id: String(body.shop_id || '').trim(),
      catalog:
        typeof body.catalog === 'object' && body.catalog !== null
          ? (body.catalog as Record<string, unknown>)
          : {},
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('TikTok browser catalog sync failed:', error)
    return NextResponse.json({ error: 'tiktok_browser_catalog_sync_failed' }, { status: 502 })
  }
}
