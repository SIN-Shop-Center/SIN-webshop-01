// Purpose: Täglicher FX-Rate-Update von frankfurter.app (Issue #35)
// Docs: https://frankfurter.dev — ECB-Daten, kein API-Key, kostenlos
//
// Schedule: Vercel Cron "0 1 * * *" (1 Uhr, vor cj-sync um 3).
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let res: Response
  try {
    res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=EUR',
      { signal: AbortSignal.timeout(10_000) },
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 },
    )
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `frankfurter returned ${res.status}` },
      { status: 502 },
    )
  }

  const { rates } = (await res.json()) as { rates: { EUR: number } }
  if (typeof rates?.EUR !== 'number') {
    return NextResponse.json({ error: 'malformed response' }, { status: 502 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('fx_rates').upsert({
    currency_pair: 'USD_EUR',
    rate: rates.EUR,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, rate: rates.EUR })
}
