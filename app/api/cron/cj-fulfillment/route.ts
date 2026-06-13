// Purpose: Cron endpoint — tracking sync + shipping notification (Step 7)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
//
// Schedule: Vercel Cron "0 */4 * * *" (alle 4 Stunden).
// Auth: Authorization: Bearer $CRON_SECRET
//
// tracking_notified_at wird erst NACH erfolgreicher Mail gesetzt — bei
// Mail-Fehler catcht der nächste Lauf die Order erneut.
//
// Issue #36: Batch 50 → 15, Cloudflare Worker 30s CPU-Limit.
// Issue #39: Heartbeat an Uptime Kuma am Ende.

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCjOrderDetail } from '@/lib/cj/orders'
import { sendShippingNotification } from '@/lib/email'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let trackedCount = 0
  const errors: string[] = []

  // Forwarded + bereits shipped aber unbenachrichtigte Orders abholen
  const { data: forwarded } = await supabase
    .from('orders')
    .select('id, email, cj_order_id')
    .in('fulfillment_status', ['forwarded', 'shipped'])
    .is('tracking_notified_at', null)
    .not('cj_order_id', 'is', null)
    .limit(10) // Issue #36: Worker 30s CPU-Limit

  for (const order of forwarded ?? []) {
    try {
      const detail = await getCjOrderDetail(order.cj_order_id!)

      if (detail.trackNumber) {
        await supabase
          .from('orders')
          .update({
            tracking_number: detail.trackNumber,
            cj_order_status: detail.orderStatus,
            fulfillment_status: 'shipped',
          })
          .eq('id', order.id)

        // tracking_notified_at erst NACH erfolgreicher Mail setzen —
        // bei Fehler bleibt es NULL und der nächste Cron-Lauf retryt.
        if (order.email) {
          try {
            await sendShippingNotification({
              to: order.email,
              orderId: order.id,
              trackingNumber: detail.trackNumber,
            })
            await supabase
              .from('orders')
              .update({ tracking_notified_at: new Date().toISOString() })
              .eq('id', order.id)
          } catch (e) {
            errors.push(`mail ${order.id}: ${e instanceof Error ? e.message : 'unknown'}`)
          }
        }
        trackedCount++
      } else {
        await supabase
          .from('orders')
          .update({ cj_order_status: detail.orderStatus })
          .eq('id', order.id)
      }
    } catch (e) {
      errors.push(`tracking ${order.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  const { count: failedCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('fulfillment_status', 'failed')

  // Issue #39: Heartbeat — Fehler schlagen Uptime-Kuma-Monitor an
  try {
    await fetch(new URL('/api/monitoring/heartbeat', request.url), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.CRON_SECRET}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        job: 'cj-fulfillment',
        status: errors.length ? 'fail' : 'ok',
        msg: `tracked=${trackedCount} failed_awaiting_attention=${failedCount ?? 0} errors=${errors.length}`,
      }),
    })
  } catch {
    // Heartbeat-Fehler nicht fatal
  }

  return NextResponse.json({
    checked: forwarded?.length ?? 0,
    shipped: trackedCount,
    failedNeedingAttention: failedCount ?? 0,
    errors,
  })
}
