// Purpose: Cron — verlassene Carts aufräumen + Stock-Reservierungen freigeben (Issue #37)
// Docs: Issue #37 — Inventory-Race-Condition
// Cart-Cleanup ergänzt den reserve_stock-Mechanismus um die andere Hälfte:
// Wer was reserviert hat und es nicht kauft, gibt den Stock nach 24h wieder frei.
//
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Primary: Nutze die neue cleanup_stale_reservations RPC (aus #37 Migration)
  // Diese ist atomar und race-condition-sicher
  let staleReleased = 0
  try {
    const { data: released } = await admin.rpc('cleanup_stale_reservations')
    staleReleased = Number(released) || 0
  } catch (e) {
    console.error('[cart-cleanup] cleanup_stale_reservations failed, falling back to legacy release:', e)

    // Fallback: Alte Cart-Cleanup-Logik (für Kompatibilität)
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: stale } = await admin
      .from('cart_items')
      .select('id, product_id, quantity')
      .lt('updated_at', cutoff)
      .limit(200)

    for (const item of stale ?? []) {
      try {
        await admin.rpc('release_stock', {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        })
        await admin.from('cart_items').delete().eq('id', item.id)
        staleReleased++
      } catch (err) {
        console.error(`[cart-cleanup] release failed for ${item.id}:`, err)
      }
    }
  }

  // Issue #54: alte processed_events aufräumen (> 30 Tage)
  const eventsCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { count: eventsDeleted } = await admin
    .from('processed_events')
    .delete({ count: 'exact' })
    .lt('processed_at', eventsCutoff)

  return NextResponse.json({
    ok: true,
    reservationsReleased: staleReleased,
    eventsDeleted: eventsDeleted ?? 0,
  })
}
