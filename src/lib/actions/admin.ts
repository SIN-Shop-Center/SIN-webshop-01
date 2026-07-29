// Purpose: Admin server actions (orders, stats, CJ-retry, products)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
//
// SECURITY: Jede Action ruft requireAdmin() als erste Zeile auf. Der
// Admin-Check ist NICHT nur in der UI — direkte Fetch-Calls werden geblockt.

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminOrder {
  id: string
  email: string
  amount_total: number
  currency: string
  status: string
  fulfillment_status: string
  cj_order_id: string | null
  cj_order_status: string | null
  tracking_number: string | null
  items: Array<{
    title: string
    quantity: number
    unit_amount: number
    product_id: string | null
  }>
  shipping_address: {
    name?: string
    phone?: string
    address?: {
      country?: string
      state?: string
      city?: string
      line1?: string
      line2?: string
      postal_code?: string
    }
  } | null
  created_at: string
}

export async function getAdminOrders(filter?: string): Promise<AdminOrder[]> {
  await requireAdmin()
  const supabase = createAdminClient()

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (filter && filter !== 'all') {
    query = query.eq('fulfillment_status', filter)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((order) => ({
    ...order,
    amount_total: order.amount_total ?? 0,
    items: Array.isArray(order.items) ? order.items as AdminOrder['items'] : [],
    shipping_address: order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
      ? order.shipping_address as AdminOrder['shipping_address']
      : null,
  }))
}

export async function getAdminStats() {
  await requireAdmin()
  const supabase = createAdminClient()

  const [total, failed, forwarded, shipped] = await Promise.all([
    supabase.from('orders').select('amount_total', { count: 'exact' }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('fulfillment_status', 'failed'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('fulfillment_status', 'forwarded'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('fulfillment_status', 'shipped'),
  ])

  const revenueCents = (total.data ?? []).reduce(
    (sum, o) => sum + (o.amount_total ?? 0),
    0,
  )

  return {
    orderCount: total.count ?? 0,
    revenueCents,
    failedCount: failed.count ?? 0,
    forwardedCount: forwarded.count ?? 0,
    shippedCount: shipped.count ?? 0,
  }
}

export async function retryCjForwarding(
  orderId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, fulfillment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) return { ok: false, error: orderError.message }
  if (!order || !['failed', 'pending'].includes(order.fulfillment_status)) {
    return { ok: false, error: 'Order nicht gefunden oder nicht erneut versendbar' }
  }

  const { error: resetError } = await supabase
    .from('orders')
    .update({ fulfillment_attempts: 0, fulfillment_status: 'pending', fulfillment_error: null })
    .eq('id', orderId)
  if (resetError) return { ok: false, error: resetError.message }

  const result = await submitOrderToCj(orderId)
  revalidatePath('/admin')
  revalidatePath('/admin/bestellungen')
  return result
}

export interface AdminProduct {
  id: string
  title: string
  price: number
  stock: number
  images: string[]
  is_active: boolean
  is_featured: boolean
  cj_product_id: string | null
  cj_cost_price: number | null
  cj_last_synced_at: string | null
  pipeline_state: string
  approval_state: string
  creative_status: string
  data_quality_score: number
  risk_level: string
  publish_blockers: string[]
  tiktok_status: string | null
  tiktok_product_id: string | null
}

function adminStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, title_de, price, stock, images, image_gallery, metadata, is_active, cj_product_id, cj_cost_price, cj_last_synced_at, pipeline_state, approval_state, creative_status, data_quality_score, risk_level, publish_blockers, tiktok_status, tiktok_product_id')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((product) => ({
    id: product.id,
    title: product.title_de || product.name,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    images: [...new Set([
      ...adminStringArray(product.images),
      ...adminStringArray(product.image_gallery),
    ])],
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.metadata && typeof product.metadata === 'object' && !Array.isArray(product.metadata) && product.metadata.is_featured),
    cj_product_id: product.cj_product_id,
    cj_cost_price: product.cj_cost_price == null ? null : Number(product.cj_cost_price),
    cj_last_synced_at: product.cj_last_synced_at,
    pipeline_state: product.pipeline_state ?? 'legacy',
    approval_state: product.approval_state ?? 'review_required',
    creative_status: product.creative_status ?? 'missing',
    data_quality_score: Number(product.data_quality_score || 0),
    risk_level: product.risk_level ?? 'unknown',
    publish_blockers: adminStringArray(product.publish_blockers),
    tiktok_status: product.tiktok_status,
    tiktok_product_id: product.tiktok_product_id,
  }))
}

export async function toggleFeatured(productId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('metadata')
    .eq('id', productId)
    .maybeSingle()

  if (product) {
    const metadata = product.metadata && typeof product.metadata === 'object' && !Array.isArray(product.metadata)
      ? product.metadata
      : {}
    await supabase
      .from('products')
      .update({ metadata: { ...metadata, is_featured: !metadata.is_featured } })
      .eq('id', productId)
  }

  revalidatePath('/admin/produkte')
  revalidatePath('/')
}
