// Purpose: Dynamic shipping costs via CJ freight — upgraded from flat-rate
// Docs: AGENTS.md — used by checkout.ts, warenkorb, versand
//
// Calls CJ /logistic/freightCalculate and caches result in KV-like pattern.
// Falls CJ nicht erreichbar: Fallback auf 4,99 € Flat.

import { getCheapestFreight } from '@/lib/cj/freight'
import { getUsdToEurRate } from '@/app/lib/fx-rate'
import { SHIPPING } from '@/lib/shipping-constants'

export { SHIPPING }

const HANDLING_FEE_EUR = 1.0
const MAX_CUSTOMER_SHIPPING_EUR = 6.99

type CachedQuote = { costEur: number; agingMin: number; agingMax: number }

const quoteCache = new Map<string, { quote: CachedQuote; ts: number }>()
const CACHE_TTL_MS = 300_000

export async function getShippingQuoteAsync(params: {
  items: { cj_variant_id: string; quantity: number }[]
  subtotalCents: number
}): Promise<{ costCents: number; agingMin: number; agingMax: number }> {
  const { items, subtotalCents } = params

  if (subtotalCents >= SHIPPING.freeAboveCents) {
    return { costCents: 0, agingMin: SHIPPING.deliveryDaysMin, agingMax: SHIPPING.deliveryDaysMax }
  }

  const cacheKey = items.map((i) => `${i.cj_variant_id}:${i.quantity}`).sort().join('|')
  const cached = quoteCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    const c = cached.quote
    return { costCents: Math.round(c.costEur * 100), agingMin: c.agingMin, agingMax: c.agingMax }
  }

  try {
    const [freight, rate] = await Promise.all([
      getCheapestFreight({ items }),
      getUsdToEurRate(),
    ])
    if (!freight) return fallback(subtotalCents)

    const internalCostEur = Number((freight.priceUsd * rate).toFixed(2))
    const rawCost = internalCostEur + HANDLING_FEE_EUR
    const costEur = Math.min(
      MAX_CUSTOMER_SHIPPING_EUR,
      Number((Math.ceil(rawCost * 2) / 2 - 0.01).toFixed(2)),
    )

    const quote: CachedQuote = {
      costEur,
      agingMin: freight.agingDays.min,
      agingMax: freight.agingDays.max,
    }
    quoteCache.set(cacheKey, { quote, ts: Date.now() })

    return { costCents: Math.round(costEur * 100), agingMin: quote.agingMin, agingMax: quote.agingMax }
  } catch {
    return fallback(subtotalCents)
  }
}

function fallback(subtotalCents: number): { costCents: number; agingMin: number; agingMax: number } {
  return {
    costCents: subtotalCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING.standardCents,
    agingMin: SHIPPING.deliveryDaysMin,
    agingMax: SHIPPING.deliveryDaysMax,
  }
}

export function getShippingCents(subtotalCents: number): number {
  return subtotalCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING.standardCents
}
