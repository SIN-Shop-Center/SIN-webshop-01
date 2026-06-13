// Purpose: Server Actions für Bestellhistorie + Nachbestellung
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addToCart } from '@/lib/actions/cart'

export interface OrderItem {
  product_id: string
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
  shipping_address: Record<string, any> | null
  created_at: string
  shipped_at: string | null
  delivered_at: string | null
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
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CustomerOrder[]
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
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  if (data.user_id !== user.id) return null
  return data as CustomerOrder & { user_id: string }
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
      await addToCart(item.product_id, item.quantity)
      added++
    } catch {
      unavailable.push(item.title)
    }
  }

  revalidatePath('/warenkorb')
  return { added, unavailable }
}
