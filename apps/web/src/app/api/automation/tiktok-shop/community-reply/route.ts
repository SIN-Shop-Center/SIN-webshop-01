export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { dispatchTikTokCommunityReplyViaBrowser } from '@/lib/automation/tiktok-shop-browser-actions'
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
    const result = await dispatchTikTokCommunityReplyViaBrowser({
      browser_session_ref: String(body.browser_session_ref || '').trim(),
      target_url: String(body.target_url || '').trim(),
      candidate_urls: body.candidate_urls,
      browser_recipe: typeof body.browser_recipe === 'object' && body.browser_recipe !== null ? (body.browser_recipe as Record<string, unknown>) : {},
      request_payload: typeof body.request_payload === 'object' && body.request_payload !== null ? (body.request_payload as Record<string, unknown>) : {},
      reply_text: String(body.reply_text || '').trim(),
      comment_id: String(body.comment_id || '').trim(),
      conversation_key: String(body.conversation_key || '').trim(),
      post_id: String(body.post_id || '').trim(),
      author_handle: String(body.author_handle || '').trim(),
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('TikTok browser community reply failed:', error)
    return NextResponse.json({ error: 'tiktok_browser_community_reply_failed' }, { status: 502 })
  }
}
