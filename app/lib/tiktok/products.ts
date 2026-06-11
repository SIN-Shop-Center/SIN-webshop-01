// Purpose: TikTok Shop Product API — Bilder, Kategorien, Produkt-CRUD, Inventar
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md
// API-Version: 202309 (Product API)

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { tiktokRequest, tiktokUpload } from '@/lib/tiktok/client'

// ── Bilder ───────────────────────────────────────────────────────────────────

export async function uploadProductImage(imageUrl: string): Promise<string> {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Bild nicht ladbar: ${imageUrl}`)
  const blob = await imgRes.blob()

  const form = new FormData()
  form.append('data', blob, 'product.jpg')
  form.append('use_case', 'MAIN_IMAGE')

  const data = await tiktokUpload<{ uri: string; url: string }>(
    '/product/202309/images/upload',
    form,
  )
  return data.uri
}

// ── Kategorie-Empfehlung ─────────────────────────────────────────────────────

export async function recommendCategory(params: {
  title: string
  description?: string
  imageUri?: string
}): Promise<string> {
  const data = await tiktokRequest<{
    leaf_category_id: string
    categories?: Array<{ id: string; name: string }>
  }>('/product/202309/categories/recommend', {
    method: 'POST',
    body: {
      product_title: params.title,
      description: params.description,
      images: params.imageUri ? [{ uri: params.imageUri }] : undefined,
    },
  })

  if (!data.leaf_category_id) {
    throw new Error(`Keine Kategorie-Empfehlung für "${params.title}"`)
  }
  return data.leaf_category_id
}

// ── Warehouse ────────────────────────────────────────────────────────────────

export async function getDefaultWarehouseId(): Promise<string> {
  const supabase = createAdminClient()
  const { data: cached } = await supabase
    .from('tiktok_auth')
    .select('warehouse_id')
    .eq('id', 1)
    .maybeSingle()

  if (cached?.warehouse_id) return cached.warehouse_id

  const data = await tiktokRequest<{
    warehouses: Array<{ id: string; type: string; is_default: boolean }>
  }>('/logistics/202309/warehouses', { method: 'GET' })

  const warehouse =
    data.warehouses?.find((w: { is_default: boolean }) => w.is_default) ?? data.warehouses?.[0]
  if (!warehouse) throw new Error('Kein TikTok-Warehouse gefunden.')

  await supabase.from('tiktok_auth').update({ warehouse_id: warehouse.id }).eq('id', 1)
  return warehouse.id
}

// ── Produkt erstellen ────────────────────────────────────────────────────────

export interface TikTokProductInput {
  title: string
  description: string
  categoryId: string
  imageUris: string[]
  sellerSku: string
  price: string
  currency: string
  quantity: number
  warehouseId: string
  packageWeightKg?: number
}

export async function createTikTokProduct(input: TikTokProductInput): Promise<string> {
  const data = await tiktokRequest<{ product_id: string }>('/product/202309/products', {
    method: 'POST',
    body: {
      title: input.title.slice(0, 255),
      description: input.description,
      category_id: input.categoryId,
      main_images: input.imageUris.slice(0, 9).map((uri) => ({ uri })),
      package_weight: {
        value: String(input.packageWeightKg ?? 0.5),
        unit: 'KILOGRAM',
      },
      skus: [
        {
          seller_sku: input.sellerSku,
          price: {
            amount: input.price,
            currency: input.currency,
          },
          inventory: [
            {
              warehouse_id: input.warehouseId,
              quantity: input.quantity,
            },
          ],
        },
      ],
    },
  })

  return data.product_id
}

// ── Inventar-Sync ────────────────────────────────────────────────────────────

export async function getTikTokProductSkus(
  productId: string,
): Promise<Array<{ id: string; seller_sku: string }>> {
  const data = await tiktokRequest<{
    skus: Array<{ id: string; seller_sku: string }>
  }>(`/product/202309/products/${productId}`, { method: 'GET' })
  return data.skus ?? []
}

export async function getTikTokProductStatus(productId: string): Promise<string> {
  const data = await tiktokRequest<{ status: string }>(
    `/product/202309/products/${productId}`,
    { method: 'GET' },
  )
  return data.status
}

export async function updateTikTokInventory(params: {
  productId: string
  skuId: string
  warehouseId: string
  quantity: number
}): Promise<void> {
  await tiktokRequest(`/product/202309/products/${params.productId}/inventory/update`, {
    method: 'POST',
    body: {
      skus: [
        {
          id: params.skuId,
          inventory: [
            {
              warehouse_id: params.warehouseId,
              quantity: params.quantity,
            },
          ],
        },
      ],
    },
  })
}

export async function updateTikTokPrice(params: {
  productId: string
  skuId: string
  price: string
  currency: string
}): Promise<void> {
  await tiktokRequest(`/product/202309/products/${params.productId}/prices/update`, {
    method: 'POST',
    body: {
      skus: [
        {
          id: params.skuId,
          price: {
            amount: params.price,
            currency: params.currency,
          },
        },
      ],
    },
  })
}
