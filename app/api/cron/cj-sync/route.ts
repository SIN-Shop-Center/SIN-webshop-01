// Purpose: Cron endpoint — price/stock/media sync (Step 7 + Step 11)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
//
// Schedule: Vercel Cron "0 3 * * *" (täglich um 3 Uhr).
// Auth: Authorization: Bearer $CRON_SECRET
//
// Issue #36: Batch auf 10 limitiert — Cloudflare Worker 30s CPU-Limit.
//   10 Produkte × (2 CJ-Calls + 1.1s Sleep) ≈ 35s, knapp unter Limit.
//   Bei zu vielen Produkten Schedule auf */3h umstellen.

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cjRequest } from '@/lib/cj/client'

const MULTIPLIER = Number(process.env.CJ_PRICE_MULTIPLIER ?? '2.5')

function calcPrice(costUsd: number): string {
  const raw = costUsd * MULTIPLIER
  return (Math.ceil(raw) - 0.01).toFixed(2)
}

interface CjVariant {
  vid: string
  variantSellPrice?: number
  variantSku?: string
  variantKey?: string
  variantStock?: number
  variantImage?: string
}

interface CjProductDetail {
  pid?: string
  productImage?: string
  productImageSet?: string[]
  variants?: CjVariant[]
  sellPrice?: number
  suggestSellPrice?: number
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Issue #36: Batch 20 → 10, Cloudflare Worker 30s CPU-Limit
  const { data: products } = await supabase
    .from('products')
    .select('id, cj_product_id, cj_variant_id')
    .not('cj_product_id', 'is', null)
    .order('cj_last_synced_at', { ascending: true, nullsFirst: true })
    .limit(10)

  let updated = 0
  const errors: string[] = []

  for (const product of products ?? []) {
    try {
      const detail = await cjRequest<CjProductDetail>('/product/query', {
        query: { pid: product.cj_product_id! },
      })

      const variant = detail.variants?.find((v) => v.vid === product.cj_variant_id)
      const cost = Number(variant?.variantSellPrice ?? detail.sellPrice ?? 0)
      const sellPrice = Number(detail.sellPrice ?? cost)

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

      // ── Image gallery (PDP) — productImageSet kann Array ODER JSON-String sein
      const rawSet = detail.productImageSet
      const imageSet: string[] = Array.isArray(rawSet)
        ? rawSet
        : typeof rawSet === 'string'
          ? (() => { try { return JSON.parse(rawSet) } catch { return [] } })()
          : []
      const imageGallery: string[] = [
        detail.productImage,
        ...imageSet,
      ].filter((url, i, arr): url is string => Boolean(url) && arr.indexOf(url) === i)

      // ── Variants (variant selector) ────────────────────────────────────
      const variants = (detail.variants ?? []).map((v) => ({
        cj_variant_id: v.vid,
        sku: v.variantSku ?? null,
        name: v.variantKey ?? null,
        price:
          Number(v.variantSellPrice ?? detail.sellPrice ?? 0) > 0
            ? calcPrice(Number(v.variantSellPrice ?? detail.sellPrice ?? 0))
            : null,
        stock: Number(v.variantStock ?? 0),
        image_url: v.variantImage || detail.productImage || null,
      }))

      // ── Compare-at price (sale strikethrough) ──────────────────────────
      // NUR setzen wenn CJ echte suggestSellPrice (Hersteller-UVP) liefert.
      // KEIN künstlicher 1.3×-Fallback — das wäre irreführend (PAngV §11).
      const ourPrice = cost > 0 ? Number(calcPrice(cost)) : sellPrice * MULTIPLIER
      const suggestUsd = Number(detail.suggestSellPrice ?? 0)
      const compareAtPrice =
        suggestUsd > 0 && suggestUsd * MULTIPLIER > ourPrice
          ? Number((Math.ceil(suggestUsd * MULTIPLIER) - 0.01).toFixed(2))
          : null

      await supabase
        .from('products')
        .update({
          ...(cost > 0 ? { price: calcPrice(cost), cj_cost_price: cost } : {}),
          stock,
          cj_last_synced_at: new Date().toISOString(),
          compare_at_price: compareAtPrice,
          image_gallery: imageGallery,
          variants: variants,
        })
        .eq('id', product.id)

      updated++
      await new Promise((r) => setTimeout(r, 1100)) // Rate-Limit schonen
    } catch (e) {
      errors.push(`${product.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Warn-Log bei unvollständigem Batch → Hinweis auf mögliches Timeout
  const total = products?.length ?? 0
  if (total > 0 && updated < total * 0.8) {
    console.warn(
      `[cj-sync] nur ${updated}/${total} aktualisiert — mögliches Cloudflare-Worker-Timeout`,
    )
  }

  return NextResponse.json({ synced: updated, total, errors })
}
