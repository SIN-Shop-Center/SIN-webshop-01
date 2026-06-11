// Purpose: Orchestrierung — Supabase-Produkt → TikTok Shop Listing
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
// Flow: Bilder hochladen → Kategorie empfehlen → Warehouse → Produkt erstellen

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  createTikTokProduct,
  getDefaultWarehouseId,
  recommendCategory,
  uploadProductImage,
} from '@/lib/tiktok/products'

const TIKTOK_MULTIPLIER = Number(process.env.TIKTOK_PRICE_MULTIPLIER ?? '2.8')
const TIKTOK_CURRENCY = process.env.TIKTOK_CURRENCY ?? 'EUR'

export function calcTikTokPrice(costUsd: number, fallbackPrice: number): string {
  const base = costUsd > 0 ? costUsd * TIKTOK_MULTIPLIER : fallbackPrice
  return (Math.ceil(base) - 0.01).toFixed(2)
}

function buildDescription(p: {
  description: string
  features?: string[] | null
  specifications?: Record<string, string> | null
}): string {
  const features = (p.features ?? [])
    .map((f) => `<li>${f}</li>`)
    .join('')
  const specs = Object.entries(p.specifications ?? {})
    .map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`)
    .join('')

  return [
    `<p>${p.description}</p>`,
    features ? `<p><strong>Highlights:</strong></p><ul>${features}</ul>` : '',
    specs ? `<p><strong>Details:</strong></p><ul>${specs}</ul>` : '',
  ].join('')
}

export interface PublishResult {
  productId: string
  tiktokProductId?: string
  error?: string
}

export async function publishProductToTikTok(productId: string): Promise<PublishResult> {
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select(
      'id, title, description, price, stock, image_url, image_gallery, features, specifications, cj_cost_price, tiktok_product_id',
    )
    .eq('id', productId)
    .maybeSingle()

  if (!product) return { productId, error: 'Produkt nicht gefunden' }
  if (product.tiktok_product_id) {
    return { productId, tiktokProductId: product.tiktok_product_id }
  }

  await supabase
    .from('products')
    .update({ tiktok_status: 'publishing', tiktok_last_error: null })
    .eq('id', productId)

  try {
    // 1. Bilder hochladen (max 9, Hauptbild zuerst)
    const imageUrls: string[] = [
      product.image_url,
      ...((product.image_gallery as string[] | null) ?? []),
    ]
      .filter(Boolean)
      .filter((url, i, arr) => arr.indexOf(url) === i)
      .slice(0, 9)

    const imageUris: string[] = []
    for (const url of imageUrls) {
      imageUris.push(await uploadProductImage(url))
      await new Promise((r) => setTimeout(r, 300))
    }
    if (imageUris.length === 0) throw new Error('Keine Produktbilder vorhanden')

    // 2. Kategorie empfehlen lassen
    const categoryId = await recommendCategory({
      title: product.title,
      description: product.description,
      imageUri: imageUris[0],
    })

    // 3. Warehouse
    const warehouseId = await getDefaultWarehouseId()

    // 4. Produkt erstellen
    const tiktokProductId = await createTikTokProduct({
      title: product.title,
      description: buildDescription(product),
      categoryId,
      imageUris,
      sellerSku: `SIN-${product.id}`,
      price: calcTikTokPrice(Number(product.cj_cost_price ?? 0), Number(product.price)),
      currency: TIKTOK_CURRENCY,
      quantity: Math.max(0, Number(product.stock ?? 0)),
      warehouseId,
    })

    await supabase
      .from('products')
      .update({
        tiktok_product_id: tiktokProductId,
        tiktok_status: 'published',
        tiktok_published_at: new Date().toISOString(),
        tiktok_last_synced_at: new Date().toISOString(),
      })
      .eq('id', productId)

    return { productId, tiktokProductId }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown'
    await supabase
      .from('products')
      .update({ tiktok_status: 'failed', tiktok_last_error: message })
      .eq('id', productId)
    return { productId, error: message }
  }
}
