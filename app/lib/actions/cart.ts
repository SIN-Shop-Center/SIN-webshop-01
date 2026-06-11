// Purpose: Cart server actions — guest-capable via httpOnly cookie (Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const CART_COOKIE = 'sin_cart_id'

async function getCartId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CART_COOKIE)?.value ?? null
}

async function getOrCreateCartId(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CART_COOKIE)?.value
  if (existing) return existing

  const cartId = randomUUID()
  cookieStore.set(CART_COOKIE, cartId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
    path: '/',
  })
  return cartId
}

export interface CartItem {
  id: string
  product_id: string
  quantity: number
}

export async function getCartItems(): Promise<CartItem[]> {
  const cartId = await getCartId()
  if (!cartId) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getCartCount(): Promise<number> {
  const items = await getCartItems()
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export async function addToCart(productId: string, quantity = 1) {
  const cartId = await getOrCreateCartId()
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('cart_items')
      .update({
        quantity: Math.min(existing.quantity + quantity, 99),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('cart_items').insert({
      cart_id: cartId,
      product_id: productId,
      quantity: Math.min(quantity, 99),
    })
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout') // Navbar-Badge aktualisieren
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const cartId = await getCartId()
  if (!cartId) return

  const supabase = createAdminClient()

  if (quantity <= 0) {
    await supabase.from('cart_items').delete().eq('id', itemId).eq('cart_id', cartId)
  } else {
    await supabase
      .from('cart_items')
      .update({ quantity: Math.min(quantity, 99), updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('cart_id', cartId)
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout')
}

export async function removeFromCart(itemId: string) {
  await updateCartQuantity(itemId, 0)
}
