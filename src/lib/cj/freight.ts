// Purpose: Real CJ shipping cost calculation — cheapest traceable line to DE
// Docs: AGENTS.md — CJ API: POST /logistic/freightCalculate

import 'server-only'

import { cjRequest } from '@/lib/cj/client'

type CjFreightOption = {
  logisticName: string
  logisticPrice: number
  logisticAging: string
}

export type FreightQuote = {
  logisticName: string
  priceUsd: number
  agingDays: { min: number; max: number }
}

export async function getCheapestFreight({
  items,
  countryCode = 'DE',
}: {
  items: { cj_variant_id: string; quantity: number }[]
  countryCode?: string
}): Promise<FreightQuote | null> {
  const options = await cjRequest<CjFreightOption[]>('/logistic/freightCalculate', {
    method: 'POST',
    body: {
      startCountryCode: 'CN',
      endCountryCode: countryCode,
      products: items.map((i) => ({ vid: i.cj_variant_id, quantity: i.quantity })),
    },
  })

  if (!options || options.length === 0) return null

  const sorted = [...options].sort((a, b) => a.logisticPrice - b.logisticPrice)
  const best = sorted[0]
  const [min, max] = best.logisticAging.split('-').map((n) => Number(n.trim()) || 0)

  return {
    logisticName: best.logisticName,
    priceUsd: best.logisticPrice,
    agingDays: { min: min || 7, max: max || 15 },
  }
}
