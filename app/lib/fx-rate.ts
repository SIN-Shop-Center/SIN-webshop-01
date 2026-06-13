// Purpose: Centralized FX rate module — USD→EUR with DB cache + API fallback
// Docs: scripts/supabase/setup-fx-rates.sql
//
// Priority chain: shop.fx_rates (fresh) → Frankfurter API → hardcoded fallback.
// Cron (fx-update) writes rates to DB; this module reads them.

import 'server-only'

import { createAdminClient } from '@/app/lib/supabase/admin'

const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD&to=EUR'
const STALE_THRESHOLD_MS = 6 * 3600 * 1000
const HARDCODED_FALLBACK = 0.92

let memoryRate: { rate: number; ts: number } | null = null
const MEMORY_TTL_MS = 300_000

export async function getEurFromUsd(usdAmount: number): Promise<number> {
  const rate = await getUsdToEurRate()
  return Math.round(usdAmount * rate * 100) / 100
}

export async function getUsdToEurRate(): Promise<number> {
  if (memoryRate && Date.now() - memoryRate.ts < MEMORY_TTL_MS) {
    return memoryRate.rate
  }

  const dbRate = await loadFromDb()
  if (dbRate !== null) {
    memoryRate = { rate: dbRate, ts: Date.now() }
    return dbRate
  }

  const apiRate = await fetchFromFrankfurter()
  if (apiRate !== null) {
    memoryRate = { rate: apiRate, ts: Date.now() }
    return apiRate
  }

  console.warn('[fx-rate] DB stale + API down — using hardcoded fallback')
  return HARDCODED_FALLBACK
}

async function loadFromDb(): Promise<number | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('fx_rates')
      .select('rate, updated_at')
      .eq('from_currency', 'USD')
      .eq('to_currency', 'EUR')
      .maybeSingle()

    if (!data) return null
    const age = Date.now() - new Date(data.updated_at).getTime()
    if (age <= STALE_THRESHOLD_MS) return Number(data.rate)

    console.warn(
      `[fx-rate] DB rate is ${Math.round(age / 3600000)}h old — stale`,
    )
    return null
  } catch (e) {
    console.warn('[fx-rate] DB read failed:', e)
    return null
  }
}

async function fetchFromFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch(FRANKFURTER_URL, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const { rates } = (await res.json()) as { rates: { EUR?: number } }
    return typeof rates?.EUR === 'number' ? rates.EUR : null
  } catch {
    return null
  }
}

export async function refreshFxRate(): Promise<{
  rate: number
  source: string
}> {
  const res = await fetch(FRANKFURTER_URL, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    throw new Error(`frankfurter returned ${res.status}`)
  }

  const { rates } = (await res.json()) as { rates: { EUR: number } }
  if (typeof rates?.EUR !== 'number') {
    throw new Error('malformed frankfurter response')
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('fx_rates').upsert(
    {
      from_currency: 'USD',
      to_currency: 'EUR',
      rate: rates.EUR,
      source: 'frankfurter',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'from_currency,to_currency' },
  )

  if (error) throw new Error(error.message)

  memoryRate = { rate: rates.EUR, ts: Date.now() }

  return { rate: rates.EUR, source: 'frankfurter' }
}
