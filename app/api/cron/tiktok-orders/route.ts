// Purpose: Cron — TikTok-Bestellungen pollen, an CJ forwarden, Tracking zurückmelden
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Stufe 5)
//
// Schedule: alle 30 min (via GitHub Action oder Vercel Cron)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { createCjOrder, getCjOrderDetail } from '@/lib/cj/orders'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { getAwaitingShipmentOrders, shipTikTokOrder } from '@/lib/tiktok/orders'

export const maxDuration = 300

const SHIPPING_PROVIDER_ID = process.env.TIKTOK_SHIPPING_PROVIDER_ID ?? ''

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const orders = await getAwaitingShipmentOrders()

  let forwarded = 0
  let shipped = 0
  const errors: string[] = []

  for (const order of orders) {
    const { data: existing } = await supabase
      .from('tiktok_orders')
      .select('status, cj_order_id, tracking_number')
      .eq('tiktok_order_id', order.id)
      .maybeSingle()

    try {
      // ── Schritt A: An CJ forwarden ──
      if (!existing || existing.status === 'received' || existing.status === 'cj_failed') {
        const lineItem = order.line_items[0]
        const productId = lineItem.seller_sku.replace(/^SIN-/, '')

        const { data: product } = await supabase
          .from('products')
          .select('id, cj_variant_id')
          .eq('id', productId)
          .maybeSingle()

        if (!product?.cj_variant_id) {
          throw new Error(`Kein cj_variant_id für seller_sku ${lineItem.seller_sku}`)
        }

        const addr = order.recipient_address
        const { cjOrderId } = await createCjOrder({
          orderNumber: `TT-${order.id}`,
          shipping: {
            name: addr.name,
            phone: addr.phone_number,
            email: '',
            country: addr.region_code,
            province: addr.state ?? '',
            city: addr.city ?? '',
            address: addr.address_line1,
            address2: addr.address_line2,
            zip: addr.postal_code,
          },
          products: order.line_items.map((li) => ({
            vid: product.cj_variant_id,
            quantity: 1,
          })),
        })

        await supabase.from('tiktok_orders').upsert({
          tiktok_order_id: order.id,
          status: 'forwarded_to_cj',
          cj_order_id: cjOrderId,
          raw_order: order,
          updated_at: new Date().toISOString(),
        })
        forwarded++
      }

      // ── Schritt B: Tracking von CJ holen und an TikTok melden ──
      const cjOrderId = existing?.cj_order_id
      if (cjOrderId && !existing?.tracking_number && SHIPPING_PROVIDER_ID) {
        const detail = await getCjOrderDetail(cjOrderId)
        if (detail.trackNumber) {
          await shipTikTokOrder({
            orderId: order.id,
            trackingNumber: detail.trackNumber,
            shippingProviderId: SHIPPING_PROVIDER_ID,
          })
          await supabase
            .from('tiktok_orders')
            .update({
              status: 'shipped',
              tracking_number: detail.trackNumber,
              updated_at: new Date().toISOString(),
            })
            .eq('tiktok_order_id', order.id)
          shipped++
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown'
      errors.push(`${order.id}: ${message}`)
      await supabase.from('tiktok_orders').upsert({
        tiktok_order_id: order.id,
        status: 'cj_failed',
        last_error: message,
        raw_order: order,
        updated_at: new Date().toISOString(),
      })
    }

    await new Promise((r) => setTimeout(r, 1100))
  }

  if (errors.length > 0) {
    await sendPipelineAlert({ subject: `${errors.length} TikTok-Order-Fehler`, errors })
  }

  return NextResponse.json({ checked: orders.length, forwarded, shipped, errors })
}
