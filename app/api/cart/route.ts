// Purpose: Cart API — add, update, remove items; uses reserve_stock/release_stock
// Docs: AGENTS.md — cart actions

import { NextRequest, NextResponse } from 'next/server'
import { getCartItems, addToCart, updateCartQuantity, removeFromCart } from '@/lib/actions/cart'

export async function GET() {
  const items = await getCartItems()
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  try {
    const { productId, quantity, variantId } = await req.json()
    if (!productId || !quantity) {
      return NextResponse.json({ error: 'productId and quantity required' }, { status: 400 })
    }
    await addToCart(productId, Number(quantity), variantId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to add to cart' }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, quantity } = await req.json()
    if (!itemId || quantity === undefined) {
      return NextResponse.json({ error: 'itemId and quantity required' }, { status: 400 })
    }
    await updateCartQuantity(itemId, Number(quantity))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    if (itemId) {
      await removeFromCart(itemId)
      return NextResponse.json({ ok: true })
    }
    // Clear all not implemented - would need new server action
    return NextResponse.json({ error: 'Use itemId to remove specific items' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
