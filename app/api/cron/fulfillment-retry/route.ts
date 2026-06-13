// Purpose: Cron — retry failed/pending paid orders to CJ fulfillment
// Docs: AGENTS.md — companion to app/lib/fulfillment/submit-order.ts
//
// Schedule: Vercel Cron "*/30 * * * *" (alle 30 Minuten).
// Auth: Authorization: Bearer $CRON_SECRET

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'paid')
    .in('fulfillment_status', ['pending', 'failed'])
    .lt('fulfillment_attempts', 5)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let succeeded = 0
  const failures: string[] = []

  for (const order of orders ?? []) {
    const result = await submitOrderToCj(order.id)
    if (result.ok) {
      succeeded++
    } else {
      failures.push(`${order.id}: ${result.error}`)
    }
  }

  return NextResponse.json({ succeeded, failures })
}
