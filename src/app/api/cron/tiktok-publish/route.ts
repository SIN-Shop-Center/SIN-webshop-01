// Purpose: Cron — veröffentlicht ausschließlich vollständig freigegebene Produkte zu TikTok Shop
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
//
// Schedule: Vercel Cron "30 3 * * *" (täglich, nach cj-sync um 3:00)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { isCronAuthorized } from '@/lib/cron-auth'
import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishProductToTikTok } from '@/lib/tiktok/publish'

export const maxDuration = 300

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: products, error: queryError } = await supabase
    .from('products')
    .select('id')
    .eq('tiktok_status', 'pending')
    .eq('is_active', true)
    .eq('pipeline_state', 'published')
    .eq('approval_state', 'approved')
    .eq('creative_status', 'approved')
    .eq('manufacturer_verified', true)
    .eq('responsible_person_verified', true)
    .is('tiktok_product_id', null)
    .limit(5)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  const results = []
  for (const product of products ?? []) {
    results.push(await publishProductToTikTok(product.id))
    await new Promise((r) => setTimeout(r, 2000))
  }

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    await sendPipelineAlert({
      subject: `${failed.length} TikTok-Publish-Fehler`,
      errors: failed.map((f) => `${f.productId}: ${f.error}`),
    })
  }

  return NextResponse.json({
    published: results.filter((r) => r.tiktokProductId).length,
    failed,
  })
}
