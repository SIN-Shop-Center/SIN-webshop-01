// Purpose: Server Actions für Bestellhistorie + Nachbestellung
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addToCart } from '@/lib/actions/cart'
import type { Json } from '@/types/database.generated'

export interface OrderItem {
  product_id: string
  variant_id?: string | null
  title: string
  quantity: number
  unit_amount: number
  image_url?: string
}

export interface CustomerOrder {
  id: string
  amount_total: number
  currency: string
  status: string
  fulfillment_status: string | null
  tracking_number: string | null
  items: OrderItem[]
  shipping_address: Record<string, unknown> | null
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
}

function orderItems(value: Json): OrderItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const productId = typeof item.product_id === 'string' ? item.product_id : ''
    const title = typeof item.title === 'string' ? item.title : ''
    const quantity = Number(item.quantity)
    const unitAmount = Number(item.unit_amount)
    if (!productId || !title || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unitAmount)) return []
    return [{
      product_id: productId,
      variant_id: typeof item.variant_id === 'string' ? item.variant_id : null,
      title,
      quantity,
      unit_amount: unitAmount,
      image_url: typeof item.image_url === 'string' ? item.image_url : undefined,
    }]
  })
}

function shippingAddress(value: Json): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function customerOrder(row: {
  id: string
  amount_total: number | null
  currency: string
  status: string
  fulfillment_status: string
  tracking_number: string | null
  items: Json
  shipping_address: Json
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
}): CustomerOrder {
  return {
    ...row,
    amount_total: row.amount_total ?? 0,
    items: orderItems(row.items),
    shipping_address: shippingAddress(row.shipping_address),
  }
}

export async function getOrders(): Promise<CustomerOrder[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, amount_total, currency, status, fulfillment_status, tracking_number, items, shipping_address, created_at, shipped_at, delivered_at',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return (data ?? []).map(customerOrder)
}

export async function getOrderById(
  id: string,
): Promise<CustomerOrder | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, amount_total, currency, status, fulfillment_status, tracking_number, items, shipping_address, created_at, shipped_at, delivered_at, user_id',
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return customerOrder(data)
}

export async function reorderItems(
  orderId: string,
): Promise<{ added: number; unavailable: string[] }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const order = await getOrderById(orderId)
  if (!order) throw new Error('Bestellung nicht gefunden')

  let added = 0
  const unavailable: string[] = []

  for (const item of order.items) {
    try {
      await addToCart(item.product_id, item.quantity, item.variant_id ?? undefined)
      added++
    } catch {
      unavailable.push(item.title)
    }
  }

  revalidatePath('/warenkorb')
  return { added, unavailable }
}
