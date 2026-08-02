// Purpose: Cart server actions — guest-capable via httpOnly cookie (Step 3)
// Issue #37: Stock wird atomar via reserve_stock/release_stock RPC reserviert.
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26), tooling/scripts/supabase/setup-reserve-stock.sql

'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProductsByIds } from '@/lib/queries'
import { CART_COOKIE, cartCookieOptions } from '@/lib/cart-cookie'
import type { CartItem, CartLineItem } from '@/lib/cart-types'
import type { Json } from '@/types/database.generated'

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
  cookieStore.set(CART_COOKIE, cartId, cartCookieOptions())
  return cartId
}

export async function getCartItems(): Promise<CartItem[]> {
  const cartId = await getCartId()
  if (!cartId) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_id, quantity, variant_id')
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? [])
    .filter((item): item is typeof item & { product_id: string } => Boolean(item.product_id))
    .map((item) => ({ ...item, variant_id: item.variant_id ?? undefined }))
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
    .select('id, stock, variants, allow_backorder')
    .eq('id', productId)
    .maybeSingle()

  if (productError) throw productError
  // Fast-Path-Check (UX). Autorität ist die atomare DB-Funktion unten.
  // Issue #53: Backorder-Produkte (allow_backorder=true) dürfen auch bei stock=0 reserviert werden.
  if (!product || (product.stock <= 0 && !product.allow_backorder)) {
    throw new Error('Produkt nicht verfügbar')
  }

  if (variantId) {
    const cjVariants = Array.isArray(product.variants) ? product.variants : []
    const matched = cjVariants.find((variant): variant is { [key: string]: Json | undefined } => {
      if (!variant || typeof variant !== 'object' || Array.isArray(variant)) return false
      return variant.cj_variant_id === variantId || variant.vid === variantId
    })
    if (!matched) throw new Error('Variante nicht verfügbar')
    const variantStock = Number(matched.stock ?? matched.variantStock ?? 0)
    if (!Number.isFinite(variantStock) || variantStock <= 0) {
      throw new Error('Variante nicht verfügbar')
    }
  }

  const requested = Number(quantity)
  if (!Number.isInteger(requested) || requested <= 0 || requested > MAX_QTY) {
    throw new Error('Ungültige Menge')
  }

  const { error: cartError } = await supabase.rpc('add_cart_item', {
    p_cart_id: cartId,
    p_product_id: productId,
    p_variant_id: (variantId ?? null)!,
    p_qty: requested,
  })
  if (cartError) {
    if (cartError.code === 'P0001') throw new Error('Produkt nicht mehr auf Lager')
    if (cartError.code === 'P0003') throw new Error('Variante nicht verfügbar')
    throw new Error(cartError.message)
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout') // Navbar-Badge aktualisieren
  return cartId
}

export async function updateCartQuantity(itemId: string, quantity: number) {
  const cartId = await getCartId()
  if (!cartId) return

  const targetQuantity = Number(quantity)
  if (!Number.isInteger(targetQuantity)) throw new Error('Ungültige Menge')

  const supabase = createAdminClient()
  const { error } = await supabase.rpc('set_cart_item_quantity', {
    p_cart_id: cartId,
    p_item_id: itemId,
    p_quantity: Math.max(0, Math.min(targetQuantity, MAX_QTY)),
  })
  if (error) {
    if (error.code === 'P0001') throw new Error('Nicht genug auf Lager')
    throw new Error(error.message)
  }

  revalidatePath('/warenkorb')
  revalidatePath('/', 'layout')
}

export async function removeFromCart(itemId: string) {
  await updateCartQuantity(itemId, 0)
}

export async function getCartItemsWithProducts(): Promise<CartLineItem[]> {
  const items = await getCartItems()
  if (items.length === 0) return []

  const products = await getProductsByIds(items.map((i) => i.product_id))
  const productMap = new Map(products.map((p) => [p.id, p]))

  return items
    .map((item) => {
      const product = productMap.get(item.product_id)
      return product ? { item, product } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}
