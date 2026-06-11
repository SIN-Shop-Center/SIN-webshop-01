// Purpose: Cron — wöchentlicher Profit-Report (TikTok-Umsatz vs. CJ-Kosten)
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
//
// Schedule: "0 7 * * 1" (montags 7:00, via GitHub Action)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const COMMISSION_PCT = Number(process.env.TIKTOK_COMMISSION_PCT ?? '9') / 100
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? ''
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'alerts@sin-shop.example.com'

export const maxDuration = 120

interface RawLineItem {
  seller_sku: string
  sale_price: string
  product_name: string
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders } = await supabase
    .from('tiktok_orders')
    .select('tiktok_order_id, status, raw_order, created_at')
    .in('status', ['forwarded_to_cj', 'shipped'])
    .gte('created_at', since)

  let revenue = 0
  let cjCost = 0
  const productSales: Record<string, { title: string; count: number; revenue: number }> = {}

  for (const order of orders ?? []) {
    const raw = order.raw_order as { line_items?: RawLineItem[] } | null
    for (const li of raw?.line_items ?? []) {
      const price = Number(li.sale_price ?? 0)
      revenue += price

      const productId = li.seller_sku.replace(/^SIN-/, '')
      const { data: product } = await supabase
        .from('products')
        .select('cj_cost_price, title')
        .eq('id', productId)
        .maybeSingle()
      cjCost += Number(product?.cj_cost_price ?? 0)

      productSales[productId] = productSales[productId] ?? {
        title: product?.title ?? li.product_name,
        count: 0,
        revenue: 0,
      }
      productSales[productId].count++
      productSales[productId].revenue += price
    }
  }

  const commission = revenue * COMMISSION_PCT
  const grossMargin = revenue - cjCost - commission

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => `<li>${p.title}: ${p.count}x — ${p.revenue.toFixed(2)} EUR</li>`)
    .join('')

  const report = {
    orders: orders?.length ?? 0,
    revenue: revenue.toFixed(2),
    cjCost: cjCost.toFixed(2),
    commission: commission.toFixed(2),
    grossMargin: grossMargin.toFixed(2),
  }

  if (RESEND_API_KEY && ALERT_EMAIL) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `[SIN TikTok] Wochenreport: ${report.grossMargin} EUR Rohmarge`,
        html: [
          '<h2>TikTok Shop Wochenreport</h2>',
          `<p>Bestellungen: <strong>${report.orders}</strong></p>`,
          '<table border="0" cellpadding="4">',
          `<tr><td>Umsatz</td><td align="right"><strong>${report.revenue} EUR</strong></td></tr>`,
          `<tr><td>CJ-Einkauf</td><td align="right">-${report.cjCost} EUR</td></tr>`,
          `<tr><td>TikTok-Provision (~${COMMISSION_PCT * 100}%)</td><td align="right">-${report.commission} EUR</td></tr>`,
          `<tr><td><strong>Rohmarge</strong></td><td align="right"><strong>${report.grossMargin} EUR</strong></td></tr>`,
          '</table>',
          topProducts ? `<h3>Top-Produkte</h3><ul>${topProducts}</ul>` : '',
          '<p><em>Schätzwerte ohne Versand/Steuern. Details: /admin/tiktok</em></p>',
        ].join(''),
      }),
    }).catch(() => {})
  }

  return NextResponse.json(report)
}
