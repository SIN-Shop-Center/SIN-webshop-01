// Purpose: Cron — published alle Produkte mit tiktok_status='pending' zu TikTok
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
//
// Schedule: Vercel Cron "30 3 * * *" (täglich, nach cj-sync um 3:00)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishProductToTikTok } from '@/lib/tiktok/publish'

export const maxDuration = 300

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('tiktok_status', 'pending')
    .is('tiktok_product_id', null)
    .limit(5)

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
