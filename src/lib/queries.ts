// Purpose: Server-side product queries via Supabase (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// Schema-Mapping: Die App erwartete ursprünglich snake_case-Spalten ('title',
// 'image_url'). Die echte shop.products-Tabelle hat aber 'name' und
// 'images' (jsonb). Lösung: SQL-View 'shop.products_v' (siehe
// tooling/scripts/supabase/setup-products-view.sql) liefert die erwarteten
// Spaltennamen via PostgREST column-aliasing. Diese Queries lesen
// aus der View, schreiben weiter in die Tabelle direkt.

import { createDataClient } from '@/lib/supabase/data-client'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product } from './data'
import { transformProduct, type DbProductViewRow } from './product-query-mapper'

// ── Raw row type from products_v View (bereits schema-gemappt) ─────────────
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
    .eq('is_active', true)
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
    .eq('is_active', true)

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
    return (data ?? []).map((row) => row.id).filter((id): id is string => id !== null)
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
