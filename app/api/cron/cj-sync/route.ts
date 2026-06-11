// Purpose: Cron endpoint — price/stock sync (Step 7)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
//
// Schedule: Vercel Cron "0 3 * * *" (täglich um 3 Uhr).
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cjRequest } from '@/lib/cj/client'

const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? '2.5')

function calcPrice(costUsd: number): string {
  const raw = costUsd * MULTIPLIER
  return (Math.ceil(raw) - 0.01).toFixed(2)
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Die am längsten nicht gesyncten CJ-Produkte zuerst (Batch von 20 pro Lauf,
  // um CJ-Rate-Limits zu respektieren)
  const { data: products } = await supabase
    .from('products')
    .select('id, cj_product_id, cj_variant_id')
    .not('cj_product_id', 'is', null)
    .order('cj_last_synced_at', { ascending: true, nullsFirst: true })
    .limit(20)

  let updated = 0
  const errors: string[] = []

  for (const product of products ?? []) {
    try {
      const detail = await cjRequest<{
        variants?: Array<{
          vid: string
          variantSellPrice?: number
        }>
        sellPrice?: number
      }>('/product/query', { query: { pid: product.cj_product_id! } })

      const variant = detail.variants?.find((v) => v.vid === product.cj_variant_id)
      const cost = Number(variant?.variantSellPrice ?? detail.sellPrice ?? 0)

      // Bestand je Variante abfragen
      let stock = 0
      try {
        const inv = await cjRequest<Array<{ vid: string; quantity?: number; countryCode?: string }>>(
          '/product/stock/queryByVid',
          { query: { vid: product.cj_variant_id! } },
        )
        stock = (inv ?? []).reduce((sum, w) => sum + (w.quantity ?? 0), 0)
      } catch {
        // Bestandsabfrage optional — Preis-Update trotzdem durchführen
      }

      await supabase
        .from('products')
        .update({
          ...(cost > 0 ? { price: calcPrice(cost), cj_cost_price: cost } : {}),
          stock,
          cj_last_synced_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      updated++
      await new Promise((r) => setTimeout(r, 1100)) // Rate-Limit schonen
    } catch (e) {
      errors.push(`${product.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  return NextResponse.json({ synced: updated, errors })
}
