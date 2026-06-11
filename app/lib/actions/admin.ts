// Purpose: Admin server actions (orders, stats, CJ-retry, products)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
//
// SECURITY: Jede Action ruft requireAdmin() als erste Zeile auf. Der
// Admin-Check ist NICHT nur in der UI — direkte Fetch-Calls werden geblockt.

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCjOrder } from '@/lib/cj/orders'

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
  return data ?? []
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

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('fulfillment_status', 'failed')
    .maybeSingle()

  if (!order) return { ok: false, error: 'Order nicht gefunden oder nicht im failed-Status' }

  const shipping = order.shipping_address
  if (!shipping?.address) return { ok: false, error: 'Keine Lieferadresse gespeichert' }

  const items: AdminOrder['items'] = order.items ?? []
  const productIds = items.map((i) => i.product_id).filter((x): x is string => !!x)

  const { data: products } = await supabase
    .from('products')
    .select('id, cj_variant_id')
    .in('id', productIds)

  const cjProducts = items
    .map((item) => {
      const match = products?.find((p) => p.id === item.product_id)
      return match?.cj_variant_id
        ? { vid: match.cj_variant_id, quantity: item.quantity }
        : null
    })
    .filter((x): x is { vid: string; quantity: number } => x !== null)

  if (cjProducts.length === 0) {
    return { ok: false, error: 'Keine CJ-Varianten zu den Artikeln gefunden' }
  }

  try {
    const addr = shipping.address
    const { cjOrderId } = await createCjOrder({
      orderNumber: order.id,
      shipping: {
        name: shipping.name ?? 'Kunde',
        phone: shipping.phone ?? '0000000000',
        email: order.email,
        country: addr.country ?? 'DE',
        province: addr.state ?? addr.city ?? '',
        city: addr.city ?? '',
        address: addr.line1 ?? '',
        address2: addr.line2 ?? undefined,
        zip: addr.postal_code ?? '',
      },
      products: cjProducts,
    })

    await supabase
      .from('orders')
      .update({
        cj_order_id: cjOrderId,
        cj_order_status: 'CREATED',
        fulfillment_status: 'forwarded',
      })
      .eq('id', order.id)

    revalidatePath('/admin')
    revalidatePath('/admin/bestellungen')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'CJ-Fehler' }
  }
}

export interface AdminProduct {
  id: string
  title: string
  price: number
  stock: number
  is_featured: boolean
  cj_product_id: string | null
  cj_cost_price: number | null
  cj_last_synced_at: string | null
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, title, price, stock, is_featured, cj_product_id, cj_cost_price, cj_last_synced_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function toggleFeatured(productId: string) {
  await requireAdmin()
  const supabase = createAdminClient()

  const { data: product } = await supabase
    .from('products')
    .select('is_featured')
    .eq('id', productId)
    .maybeSingle()

  if (product) {
    await supabase
      .from('products')
      .update({ is_featured: !product.is_featured })
      .eq('id', productId)
  }

  revalidatePath('/admin/produkte')
  revalidatePath('/')
}
