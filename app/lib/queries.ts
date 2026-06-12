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
import type { Product } from './data'

// ── Raw row type from products_v View (bereits schema-gemappt) ─────────────
interface DbProductViewRow {
  id: string
  title: string               // = products.name (in der View aliased)
  slug: string
  description: string | null
  price: number | string
  original_price: number | string | null
  image_url: string           // = products.images->>0 (in der View berechnet)
  image_gallery: string[]
  stock: number
  is_active: boolean
  variants: { colors?: string[]; sizes?: string[] } | null
  metadata: Record<string, any> | null
  rating: number
  rating_count: number
  is_featured: boolean
  created_at: string
  updated_at: string
  cj_product_id: string | null
  cj_variant_id: string | null
}

// ── Transform View-row → Product (camelCase, used by ProductCard) ──────────
function transformProduct(row: DbProductViewRow): Product {
  const metadata = (row.metadata ?? {}) as {
    features?: string[]
    specifications?: Record<string, string>
  }

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
    category: '', // TODO: join mit categories Tabelle
    subcategory: undefined,
    imageUrl: row.image_url,
    imageGallery: row.image_gallery,
    stock: row.stock,
    isFeatured: row.is_featured,
    colors: row.variants?.colors,
    sizes: row.variants?.sizes,
    features: metadata.features,
    specifications: metadata.specifications,
  }
}

// ── Public query functions ────────────────────────────────────────────────────

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = createDataClient()
  const { data, error } = await supabase
    .from('products_v')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

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
