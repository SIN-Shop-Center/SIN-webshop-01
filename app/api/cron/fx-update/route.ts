// Purpose: Täglicher FX-Rate-Update von frankfurter.app (Issue #35)
// Docs: app/lib/fx-rate.ts — refreshFxRate()
//
// Schedule: Vercel Cron "0 1 * * *" (1 Uhr, vor cj-sync um 3).
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'
import { refreshFxRate } from '@/app/lib/fx-rate'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const { rate, source } = await refreshFxRate()
    return NextResponse.json({ ok: true, rate, source })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'fx refresh failed' },
      { status: 502 },
    )
  }
}
