// Purpose: FX-Rate-Loader (Issue #35) — serverseitig, liest aus DB.
// Docs: scripts/supabase/setup-fx-rates.sql
//
// Fallback auf Env FX_RATE_USD_EUR wenn DB fehlt oder > 7 Tage alt.
// Bewusst von ./pricing.ts getrennt, damit Unit-Tests ohne
// 'server-only'-Mock auskommen.

import 'server-only'

import { createAdminClient } from '@/app/lib/supabase/admin'

const STALE_AFTER_MS = 7 * 24 * 3600 * 1000 // 7 Tage

export async function getFxRate(
  from: 'USD' = 'USD',
  to: 'EUR' = 'EUR',
): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('fx_rates')
      .select('rate, updated_at')
      .eq('currency_pair', `${from}_${to}`)
      .maybeSingle()

    if (!data) throw new Error('no fx row')
    const age = Date.now() - new Date(data.updated_at).getTime()
    if (age > STALE_AFTER_MS) {
      console.warn(
        `[pricing-fx] fx rate ${from}_${to} ist ${Math.round(age / 86400000)} Tage alt — Fallback`,
      )
      return Number(process.env.FX_RATE_USD_EUR ?? '0.92')
    }
    return Number(data.rate)
  } catch (e) {
    console.warn('[pricing-fx] fx fetch failed, fallback env:', e)
    return Number(process.env.FX_RATE_USD_EUR ?? '0.92')
  }
}
