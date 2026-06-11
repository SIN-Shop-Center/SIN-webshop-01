// Purpose: Server-side product queries via Supabase (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// TODO(Step 2 verification): The real Supabase schema has nested JSONB fields
// (images, variants, metadata) — the transformation below maps them to the
// flat Product type used by ProductCard. If the live schema differs, adjust
// transformProduct() accordingly. Run `select * from products limit 1` to verify.

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product } from './data'

// ── Raw row type from Supabase ────────────────────────────────────────────────
interface DbProductRow {
  id: string
  name: string
  slug: string
  description: string
  price: number | string
  original_price: number | string | null
  images: string[] | null
  variants: { colors?: string[]; sizes?: string[] } | null
  stock: number
  is_active: boolean
  metadata: {
    rating?: number
    ratingCount?: number
    features?: string[]
    specifications?: Record<string, string>
    category_id?: string
    supplier_id?: string
    is_featured?: boolean
  } | null
  created_at: string
  updated_at: string
}

// ── Transform DB row → Product (camelCase, used by ProductCard) ──────────────
function transformProduct(row: DbProductRow): Product {
  const images = row.images ?? []
  const variants = row.variants ?? {}
  const metadata = row.metadata ?? {}

  return {
    id: row.id,
    title: row.name,
    description: row.description,
    price: typeof row.price === 'string' ? Number(row.price) : row.price,
    originalPrice:
      row.original_price != null
        ? typeof row.original_price === 'string'
          ? Number(row.original_price)
          : row.original_price
        : undefined,
    rating: metadata.rating ?? 0,
    ratingCount: metadata.ratingCount ?? 0,
    category: '', // TODO: join with categories table
    subcategory: undefined,
    imageUrl: images[0] ?? '',
    imageGallery: images,
    stock: row.stock,
    isFeatured: metadata.is_featured ?? false,
    colors: variants.colors,
    sizes: variants.sizes,
    features: metadata.features,
    specifications: metadata.specifications,
  }
}

// ── Public query functions ────────────────────────────────────────────────────

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? [])
    .map((row) => transformProduct(row as DbProductRow))
    .filter((p) => p.isFeatured)
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => transformProduct(row as DbProductRow))
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  const transformed = transformProduct(data as DbProductRow)
  return transformed
}

/**
 * Build-time product list using the admin client (no cookies needed).
 * Used by generateStaticParams at build time.
 * Returns [] if Supabase env vars are not configured (e.g. CI without secrets)
 * OR if the database is unreachable from the build environment (e.g. when
 * SUPABASE_URL points to a private IP that the build container cannot resolve).
 * In that case pages render on-demand via dynamicParams.
 */
export async function getAllProductIdsForBuild(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true)
      .limit(100)

    if (error) {
      console.warn('[build] getAllProductIdsForBuild failed:', error.message)
      return []
    }
    return (data ?? []).map((row) => row.id)
  } catch (e) {
    // Build must not fail if the build-time DB is unreachable.
    // Pages will still render on-demand via dynamicParams=true.
    console.warn('[build] getAllProductIdsForBuild unreachable:', e instanceof Error ? e.message : e)
    return []
  }
}
