// Purpose: Server-side product queries via Supabase (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// Schema-Mapping: Die App erwartete ursprünglich snake_case-Spalten ('title',
// 'image_url'). Die echte shop.products-Tabelle hat aber 'name' und
// 'images' (jsonb). Lösung: SQL-View 'shop.products_v' (siehe
// scripts/supabase/setup-products-view.sql) liefert die erwarteten
// Spaltennamen via PostgREST column-aliasing. Diese Queries lesen
// aus der View, schreiben weiter in die Tabelle direkt.

import { createDataClient } from '@/lib/supabase/data-client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product, ProductVariant } from './data'

// ── Raw row type from products_v View (bereits schema-gemappt) ─────────────
interface DbProductViewRow {
  id: string
  title: string
  slug: string
  description: string | null
  price: number | string
  original_price: number | string | null
  compare_at_price: number | string | null
  category_id: string | null
  image_url: string
  image_gallery: string[]
  stock: number
  is_active: boolean
  variants: Record<string, any>[] | Record<string, any> | null
  metadata: Record<string, any> | null
  rating: number
  rating_count: number
  sold_count: number | null
  is_featured: boolean
  created_at: string
  updated_at: string
  cj_product_id: string | null
  cj_variant_id: string | null
}

// ── Transform View-row → Product (camelCase, used by ProductCard) ──────────
function parseVariants(variants: unknown): ProductVariant[] {
  if (Array.isArray(variants)) {
    return variants.map((v: Record<string, any>) => ({
      cj_variant_id: String(v.cj_variant_id ?? v.vid ?? ''),
      sku: v.sku ?? v.variantSku ?? null,
      name: v.name ?? v.variantKey ?? null,
      price: v.price != null ? Number(v.price) : v.variantSellPrice != null ? Number(v.variantSellPrice) : null,
      stock: Number(v.stock ?? v.variantStock ?? 0),
      image_url: v.image_url ?? v.variantImage ?? null,
    }))
  }
  return []
}

function transformProduct(row: DbProductViewRow): Product {
  const metadata = (row.metadata ?? {}) as {
    features?: string[]
    specifications?: Record<string, string>
  }
  const variants = parseVariants(row.variants)

  // Flatten image_gallery: ensure it's a flat array of strings
  const imageGallery = Array.isArray(row.image_gallery)
    ? row.image_gallery
        .flat(2)
        .filter((img): img is string => typeof img === 'string' && Boolean(img))
    : []

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    originalPrice:
      row.original_price != null
        ? typeof row.original_price === 'string'
          ? Number(row.original_price)
          : row.original_price
        : undefined,
    rating: row.rating,
    ratingCount: row.rating_count,
    category: '',
    categoryId: row.category_id ?? undefined,
    subcategory: undefined,
    imageUrl: row.image_url,
    imageGallery,
    stock: row.stock,
    soldCount: row.sold_count ?? undefined,
    createdAt: row.created_at,
    isFeatured: row.is_featured,
    colors: row.variants && !Array.isArray(row.variants) ? (row.variants as Record<string, any>).colors : undefined,
    sizes: row.variants && !Array.isArray(row.variants) ? (row.variants as Record<string, any>).sizes : undefined,
    variants: variants.length > 0 ? variants : undefined,
    features: metadata.features,
    specifications: metadata.specifications,
  }
}

// ── Public query functions ────────────────────────────────────────────────────

export async function getFeaturedProducts(limit?: number): Promise<Product[]> {
  const supabase = createDataClient()
  let query = supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (limit != null) query = query.limit(limit)
  const { data, error } = await query

  if (error) throw error
  return (data ?? [])
    .map((row) => transformProduct(row as DbProductViewRow))
    .filter((p) => p.isFeatured)
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => transformProduct(row as DbProductViewRow))
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return transformProduct(data as DbProductViewRow)
}

/**
 * Batch fetch products by IDs — fixes the N+1 pattern in the cart page.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('*')
    .in('id', ids)

  if (error) throw error
  return (data ?? []).map((row) => transformProduct(row as DbProductViewRow))
}

/**
 * Build-time product list using the admin client (no cookies needed).
 */
export async function getAllProductIdsForBuild(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products_v')
      .select('id')
      .eq('is_active', true)
      .limit(100)

    if (error) {
      console.warn('[build] getAllProductIdsForBuild failed:', error.message)
      return []
    }
    return (data ?? []).map((row) => row.id)
  } catch (e) {
    console.warn('[build] getAllProductIdsForBuild unreachable:', e instanceof Error ? e.message : e)
    return []
  }
}

export async function getDealProducts(limit = 8): Promise<Product[]> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .not('compare_at_price', 'is', null)
    .gt('compare_at_price', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getDealProducts error:', error.message)
    return []
  }
  return (data ?? [])
    .map((row) => {
      const product = transformProduct(row as DbProductViewRow)
      const compareAtPrice = Number((row as DbProductViewRow).compare_at_price)
      if (Number.isFinite(compareAtPrice) && compareAtPrice > product.price) {
        return { ...product, originalPrice: compareAtPrice }
      }
      return product
    })
    .filter((p) => p.originalPrice != null && p.originalPrice > p.price)
}
