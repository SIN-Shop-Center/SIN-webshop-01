// Purpose: Same-origin JSON adapter for atomic cart server actions.

import { NextRequest, NextResponse } from 'next/server'

import {
  addToCart,
  getCartItems,
  removeFromCart,
  updateCartQuantity,
} from '@/lib/actions/cart'
import { CART_COOKIE, cartCookieOptions } from '@/lib/cart-cookie'
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'

const MAX_BODY_BYTES = 16 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VARIANT_RE = /^[A-Za-z0-9._:-]{1,200}$/

function expectedOrigin(): string {
  return new URL(String(process.env.NEXT_PUBLIC_APP_URL || '')).origin
}

function mutationOriginAllowed(req: Request): boolean {
  try {
    const origin = req.headers.get('origin')
    if (!origin) return process.env.NODE_ENV !== 'production'
    return new URL(origin).origin === expectedOrigin()
  } catch {
    return false
  }
}

async function allowRequest(): Promise<NextResponse | null> {
  try {
    await checkRateLimit('cart-api', { limit: 120, windowSec: 15 * 60 })
    return null
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RateLimitError ? 'Zu viele Anfragen.' : 'Warenkorb vorübergehend nicht verfügbar.' },
      { status: error instanceof RateLimitError ? 429 : 503 },
    )
  }
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const contentLength = Number(req.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new Error('Payload too large')
  }
  const raw = await req.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw new Error('Payload too large')
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid JSON object')
  }
  return parsed as Record<string, unknown>
}

function quantity(value: unknown, allowZero = false): number {
  const parsed = Number(value)
  const minimum = allowZero ? 0 : 1
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > 99) {
    throw new Error('Ungültige Menge')
  }
  return parsed
}

function publicCartError(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  const known = [
    'Produkt nicht mehr auf Lager',
    'Produkt nicht verfügbar',
    'Variante nicht verfügbar',
    'Nicht genug auf Lager',
    'Ungültige Menge',
  ]
  return known.includes(message) ? message : 'Warenkorb konnte nicht geändert werden.'
}

export async function GET() {
  const denied = await allowRequest()
  if (denied) return denied

  try {
    const items = await getCartItems()
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[cart-api] read failed:', error)
    return NextResponse.json({ error: 'Warenkorb nicht verfügbar.' }, { status: 503 })
  }
}

export async function POST(req: NextRequest) {
  if (!mutationOriginAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const denied = await allowRequest()
  if (denied) return denied

  try {
    const body = await readJson(req)
    const productId = String(body.productId || '')
    const variantId = body.variantId == null ? undefined : String(body.variantId)
    if (!UUID_RE.test(productId)) throw new Error('Ungültige Produkt-ID')
    if (variantId && !VARIANT_RE.test(variantId)) throw new Error('Variante nicht verfügbar')

    const cartId = await addToCart(productId, quantity(body.quantity), variantId)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(CART_COOKIE, cartId, cartCookieOptions())
    return response
  } catch (error) {
    return NextResponse.json({ error: publicCartError(error) }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!mutationOriginAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const denied = await allowRequest()
  if (denied) return denied

  try {
    const body = await readJson(req)
    const itemId = String(body.itemId || '')
    if (!UUID_RE.test(itemId)) throw new Error('Ungültige Artikel-ID')
    await updateCartQuantity(itemId, quantity(body.quantity, true))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: publicCartError(error) }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!mutationOriginAllowed(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  const denied = await allowRequest()
  if (denied) return denied

  const itemId = new URL(req.url).searchParams.get('itemId') ?? ''
  if (!UUID_RE.test(itemId)) {
    return NextResponse.json({ error: 'Ungültige Artikel-ID' }, { status: 400 })
  }

  try {
    await removeFromCart(itemId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: publicCartError(error) }, { status: 400 })
  }
}
