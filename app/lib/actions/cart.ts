// Purpose: Cart server actions — guest-capable via httpOnly cookie (Step 3)
// Issue #37: Stock wird atomar via reserve_stock/release_stock RPC reserviert.
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26), scripts/supabase/setup-reserve-stock.sql

'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const CART_COOKIE = 'sin_cart_id'
const MAX_QTY = 99

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
  variant_id?: string
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

export async function addToCart(productId: string, quantity = 1, variantId?: string) {
  const cartId = await getOrCreateCartId()
  const supabase = createAdminClient()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, stock, variants')
    .eq('id', productId)
    .maybeSingle()

  if (productError) throw productError
  // Fast-Path-Check (UX). Autorität ist die atomare DB-Funktion unten.
  if (!product || product.stock <= 0) {
    throw new Error('Produkt nicht verfügbar')
  }

  if (variantId) {
    const cjVariants = Array.isArray(product.variants) ? product.variants : []
    const matched = cjVariants.find((v: any) => v.cj_variant_id === variantId || v.vid === variantId)
    if (matched && (matched.stock ?? matched.variantStock ?? 0) <= 0) {
      throw new Error('Variante nicht verfügbar')
    }
  }

  // Vorhandene Menge laden, um das Cap (99) VOR der Reservierung zu berechnen
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('product_id', productId)
    .maybeSingle()

  const currentQty = existing?.quantity ?? 0
  const requested = Math.max(0, Math.min(quantity, MAX_QTY - currentQty))
  if (requested === 0) {
    // Cart-Limit erreicht — nichts reservieren
    return
  }

  // Issue #37: Atomare Reservierung. Senkt Stock oder wirft P0001.
  const { error: reserveError } = await supabase.rpc('reserve_stock', {
    p_product_id: productId,
    p_qty: requested,
  })
  if (reserveError) {
    if (reserveError.code === 'P0001') {
      throw new Error('Produkt nicht mehr auf Lager')
    }
    throw new Error(reserveError.message)
  }

  let writeError: { message: string } | null = null
  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: currentQty + requested,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    writeError = error
  } else {
    const insert: Record<string, any> = {
      cart_id: cartId,
      product_id: productId,
      quantity: requested,
    }
    if (variantId) insert.variant_id = variantId
    const { error } = await supabase.from('cart_items').insert(insert)
    writeError = error
  }

  if (writeError) {
    // Kompensation: Reservierung zurückgeben, sonst Stock-Leck
    await supabase.rpc('release_stock', {
      p_product_id: productId,
      p_qty: requested,
    })
    throw new Error(writeError.message)
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout') // Navbar-Badge aktualisieren
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const cartId = await getCartId()
  if (!cartId) return

  const supabase = createAdminClient()

  // Issue #37: Item laden, um das Delta zu reservieren/freizugeben
  const { data: item } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity')
    .eq('id', itemId)
    .eq('cart_id', cartId)
    .maybeSingle()
  if (!item) return

  const newQty = Math.max(0, Math.min(quantity, MAX_QTY))
  const delta = newQty - item.quantity

  if (delta > 0) {
    const { error } = await supabase.rpc('reserve_stock', {
      p_product_id: item.product_id,
      p_qty: delta,
    })
    if (error) {
      if (error.code === 'P0001') throw new Error('Nicht genug auf Lager')
      throw new Error(error.message)
    }
  } else if (delta < 0) {
    await supabase.rpc('release_stock', {
      p_product_id: item.product_id,
      p_qty: -delta,
    })
  }

  if (newQty === 0) {
    await supabase.from('cart_items').delete().eq('id', itemId).eq('cart_id', cartId)
  } else {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .eq('cart_id', cartId)

    if (error) {
      // Kompensation nur für gerade reservierte Menge
      if (delta > 0) {
        await supabase.rpc('release_stock', { p_product_id: item.product_id, p_qty: delta })
      }
      throw new Error(error.message)
    }
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout')
}

export async function removeFromCart(itemId: string) {
  await updateCartQuantity(itemId, 0)
}
