import 'server-only'

import type Stripe from 'stripe'
import type { CartItem } from '@/lib/cart-types'
import type { Product } from '@/lib/data'
import { toCents } from '@/lib/format'
import { SHIPPING, getShippingCents, getShippingQuoteAsync } from '@/lib/shipping'

export type CheckoutShipping = {
  costCents: number
  agingMin: number
  agingMax: number
}

export type LineItemBuildResult =
  | {
      lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
      subtotalCents: number
      productMap: Map<string, Product>
      error?: never
    }
  | { error: string }

export function resolveCheckoutAppUrl(): string | null {
  try {
    const parsed = new URL(String(process.env.NEXT_PUBLIC_APP_URL || '').trim())
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('production checkout URL must use HTTPS')
    }
    parsed.pathname = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch (error) {
    console.error('[checkout] invalid NEXT_PUBLIC_APP_URL:', error)
    return null
  }
}

export function buildCheckoutLineItems(
  items: CartItem[],
  products: Product[],
): LineItemBuildResult {
  const productMap = new Map(products.map((product) => [product.id, product]))
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
  let subtotalCents = 0

  for (const item of items) {
    const product = productMap.get(item.product_id)
    if (!product) {
      console.error(`[checkout] product ${item.product_id} is missing or inactive`)
      return { error: 'Ein Produkt ist nicht mehr verfügbar. Bitte aktualisiere den Warenkorb.' }
    }

    const selectedVariant = item.variant_id
      ? product.variants?.find((variant) => variant.cj_variant_id === item.variant_id)
      : undefined
    if (item.variant_id && !selectedVariant) {
      console.error(`[checkout] unknown variant ${item.variant_id} for product ${product.id}`)
      return { error: 'Eine ausgewaehlte Produktvariante ist nicht mehr verfuegbar.' }
    }

    const unitAmount = toCents(selectedVariant?.price ?? product.price)
    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      console.error(`[checkout] invalid unit_amount ${unitAmount} for product ${product.id} (${product.title})`)
      return { error: 'Ein Produktpreis ist ungueltig. Bitte aktualisiere den Warenkorb.' }
    }

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      console.error(`[checkout] invalid quantity ${item.quantity} for product ${product.id}`)
      return { error: 'Eine Warenkorbmenge ist ungültig. Bitte aktualisiere den Warenkorb.' }
    }

    subtotalCents += unitAmount * quantity
    const displayName = selectedVariant?.name
      ? `${product.title} — ${selectedVariant.name}`
      : product.title
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: displayName.slice(0, 250),
          metadata: {
            product_id: product.id,
            ...(item.variant_id ? { variant_id: item.variant_id } : {}),
          },
        },
        unit_amount: unitAmount,
      },
      quantity,
    })
  }

  if (lineItems.length === 0) return { error: 'Keine verfügbaren Produkte im Warenkorb.' }
  return { lineItems, subtotalCents, productMap }
}

export async function resolveCheckoutShipping(
  items: CartItem[],
  productMap: Map<string, Product>,
  subtotalCents: number,
): Promise<CheckoutShipping> {
  const fallback = {
    costCents: getShippingCents(subtotalCents),
    agingMin: SHIPPING.deliveryDaysMin,
    agingMax: SHIPPING.deliveryDaysMax,
  }

  try {
    const cjItems = items
      .map((item) => {
        const product = productMap.get(item.product_id)
        if (!product?.variants?.length) return null
        const variant = item.variant_id
          ? product.variants.find((entry) => entry.cj_variant_id === item.variant_id)
          : product.variants[0]
        return variant?.cj_variant_id
          ? { cj_variant_id: variant.cj_variant_id, quantity: item.quantity }
          : null
      })
      .filter((item): item is { cj_variant_id: string; quantity: number } => item !== null)

    return cjItems.length > 0
      ? await getShippingQuoteAsync({ items: cjItems, subtotalCents })
      : fallback
  } catch (error) {
    console.error('[checkout] shipping quote failed, using flat fallback:', error)
    return fallback
  }
}
