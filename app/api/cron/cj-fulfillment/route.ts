// Purpose: Cron endpoint — tracking sync + shipping notification (Step 7)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)
//
// Schedule: Vercel Cron "0 */4 * * *" (alle 4 Stunden).
// Auth: Authorization: Bearer $CRON_SECRET

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

  // Forwarded Orders: Tracking-Nummer abfragen
  const { data: forwarded } = await supabase
    .from('orders')
    .select('id, email, cj_order_id')
    .eq('fulfillment_status', 'forwarded')
    .not('cj_order_id', 'is', null)
    .limit(50)

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
            tracking_notified_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        if (order.email) {
          try {
            await sendShippingNotification({
              to: order.email,
              orderId: order.id,
              trackingNumber: detail.trackNumber,
            })
          } catch (e) {
            console.error(`Shipping mail failed for ${order.id}:`, e)
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
      console.error(`Tracking check failed for ${order.id}:`, e)
    }
  }

  // Failed Orders zählen (manuelle Prüfung nötig — bewusst kein Blind-Retry,
  // da der Fehlergrund geklärt werden muss, z.B. leeres CJ-Wallet)
  const { count: failedCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('fulfillment_status', 'failed')

  return NextResponse.json({
    checked: forwarded?.length ?? 0,
    shipped: trackedCount,
    failedNeedingAttention: failedCount ?? 0,
  })
}
