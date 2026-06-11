// Purpose: Cron — Bestand/Preis/Listing-Status der gepublishten TikTok-Produkte
//          synchron halten
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
//
// Schedule: Vercel Cron "0 4 * * *" (täglich nach cj-sync, damit stock aktuell ist)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getDefaultWarehouseId,
  getTikTokProductSkus,
  getTikTokProductStatus,
  updateTikTokInventory,
  updateTikTokPrice,
} from '@/lib/tiktok/products'
import { calcTikTokPrice } from '@/lib/tiktok/publish'

export const maxDuration = 300

const DEAD_STATUSES = new Set(['FAILED', 'PLATFORM_DEACTIVATED', 'FREEZE', 'DELETED'])

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, stock, price, cj_cost_price, tiktok_product_id')
    .eq('tiktok_status', 'published')
    .not('tiktok_product_id', 'is', null)
    .order('tiktok_last_synced_at', { ascending: true, nullsFirst: true })
    .limit(20)

  let synced = 0
  const errors: string[] = []
  const warehouseId = await getDefaultWarehouseId()
  const currency = process.env.TIKTOK_CURRENCY ?? 'EUR'

  for (const product of products ?? []) {
    try {
      const listingStatus = await getTikTokProductStatus(product.tiktok_product_id!)

      if (DEAD_STATUSES.has(listingStatus)) {
        await supabase
          .from('products')
          .update({
            tiktok_status: 'failed',
            tiktok_last_error: `TikTok-Listing-Status: ${listingStatus} — im Seller Center prüfen (GPSR? Kategorie-Attribute?)`,
          })
          .eq('id', product.id)
        errors.push(`${product.id}: Listing ${listingStatus}`)
        continue
      }

      const skus = await getTikTokProductSkus(product.tiktok_product_id!)
      const sku = skus.find((s) => s.seller_sku === `SIN-${product.id}`) ?? skus[0]
      if (!sku) throw new Error('SKU nicht gefunden')

      await updateTikTokInventory({
        productId: product.tiktok_product_id!,
        skuId: sku.id,
        warehouseId,
        quantity: Math.max(0, Number(product.stock ?? 0)),
      })

      await updateTikTokPrice({
        productId: product.tiktok_product_id!,
        skuId: sku.id,
        price: calcTikTokPrice(Number(product.cj_cost_price ?? 0), Number(product.price)),
        currency,
      })

      await supabase
        .from('products')
        .update({ tiktok_last_synced_at: new Date().toISOString() })
        .eq('id', product.id)

      synced++
      await new Promise((r) => setTimeout(r, 1100))
    } catch (e) {
      errors.push(`${product.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  if (errors.length > 0) {
    await sendPipelineAlert({ subject: `${errors.length} TikTok-Sync-Fehler`, errors })
  }

  return NextResponse.json({ synced, errors })
}
