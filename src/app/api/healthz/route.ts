// Purpose: Liveness + DB-Readiness-Check für Uptime Kuma (Issue #39)
// Docs: kubernetes-style probe — 200 = healthy, 503 = degraded

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('products').select('id').limit(1)
    if (error) throw error
    return NextResponse.json({ status: 'ok', db: 'up' })
  } catch (e) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'down',
        error: e instanceof Error ? e.message : 'unknown',
      },
      { status: 503 },
    )
  }
}
