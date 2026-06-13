// Purpose: Cron — comprehensive health check for Supabase API, DB, and Stripe
// Docs: docs/RUNBOOK-MONITORING.md
//
// Called by external monitors (UptimeRobot, cron) every 5 min.
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface CheckResult {
  status: 'ok' | 'down'
  latency_ms: number
  detail?: string
}

async function checkSupabaseApi(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start
    if (!res.ok) {
      return { status: 'down', latency_ms: latency, detail: `HTTP ${res.status}` }
    }
    return { status: 'ok', latency_ms: latency }
  } catch (e) {
    return { status: 'down', latency_ms: Date.now() - start, detail: e instanceof Error ? e.message : 'unknown' }
  }
}

async function checkDbQuery(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('products').select('id', { count: 'exact', head: true })
    const latency = Date.now() - start
    if (error) {
      return { status: 'down', latency_ms: latency, detail: error.message }
    }
    return { status: 'ok', latency_ms: latency }
  } catch (e) {
    return { status: 'down', latency_ms: Date.now() - start, detail: e instanceof Error ? e.message : 'unknown' }
  }
}

async function checkStripe(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      return { status: 'down', latency_ms: 0, detail: 'STRIPE_SECRET_KEY not configured' }
    }
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    })
    const latency = Date.now() - start
    if (!res.ok) {
      return { status: 'down', latency_ms: latency, detail: `HTTP ${res.status}` }
    }
    return { status: 'ok', latency_ms: latency }
  } catch (e) {
    return { status: 'down', latency_ms: Date.now() - start, detail: e instanceof Error ? e.message : 'unknown' }
  }
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [supabaseApi, db, stripe] = await Promise.all([
    checkSupabaseApi(),
    checkDbQuery(),
    checkStripe(),
  ])

  const allUp = supabaseApi.status === 'ok' && db.status === 'ok' && stripe.status === 'ok'

  return NextResponse.json(
    {
      status: allUp ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: { supabase_api: supabaseApi, database: db, stripe },
    },
    { status: allUp ? 200 : 503 },
  )
}
