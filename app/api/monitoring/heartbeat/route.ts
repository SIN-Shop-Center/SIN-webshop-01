// Purpose: Cron-Job-Heartbeat für Uptime Kuma Push-Monitors (Issue #39)
// Docs: https://github.com/louislam/uptime-kuma — Push-Monitor
//
// Pattern: Cron → fetch POST /api/monitoring/heartbeat (mit Bearer CRON_SECRET)
// → Server → fetch Uptime-Kuma-Push-URL (kein Bearer, plain HTTP-Status).
// Fällt ein Cron 2× hintereinander aus, schlägt der Uptime-Kuma-Monitor an.

import { NextResponse } from 'next/server'

const KUMA_PUSH_URLS: Record<string, string | undefined> = {
  'cj-sync': process.env.KUMA_PUSH_CJ_SYNC,
  'cj-fulfillment': process.env.KUMA_PUSH_CJ_FULFILLMENT,
  'fx-update': process.env.KUMA_PUSH_FX_UPDATE,
  'tiktok-orders': process.env.KUMA_PUSH_TIKTOK_ORDERS,
}

export async function POST(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { job, status, msg } = (await req.json()) as {
    job: keyof typeof KUMA_PUSH_URLS
    status: 'ok' | 'fail'
    msg?: string
  }

  const url = KUMA_PUSH_URLS[job]
  if (!url) {
    return NextResponse.json({ ok: true, forwarded: false })
  }

  try {
    const kumaUrl = `${url}?status=${status === 'ok' ? 'up' : 'down'}&msg=${encodeURIComponent(msg ?? '')}`
    await fetch(kumaUrl, { signal: AbortSignal.timeout(5000) })
    return NextResponse.json({ ok: true, forwarded: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 502 },
    )
  }
}
