// Purpose: Resend email client (server-only, Step 4 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// Note: Lazy initialization to avoid build-time errors when RESEND_API_KEY
// is not set (e.g. in CI without secrets).

import 'server-only'

import { Resend } from 'resend'

interface OrderItem {
  title: string
  quantity: number
  unit_amount: number // Cents
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}

export async function sendOrderConfirmation(params: {
  to: string
  orderId: string
  items: OrderItem[]
  totalCents: number
}) {
  const { to, orderId, items, totalCents } = params

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px">${i.title}</td><td style="padding:4px 8px;text-align:center">${i.quantity}x</td><td style="padding:4px 8px;text-align:right">${((i.unit_amount * i.quantity) / 100).toFixed(2)} €</td></tr>`,
    )
    .join('')

  await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'SIN Shop <onboarding@resend.dev>',
    to,
    subject: `Bestellbestätigung ${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h1 style="font-size:20px">Danke für deine Bestellung</h1>
        <p>Bestellnummer: <strong>${orderId.slice(0, 8).toUpperCase()}</strong></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          ${rows}
          <tr><td colspan="2" style="padding:8px;border-top:1px solid #ddd"><strong>Gesamt</strong></td>
          <td style="padding:8px;text-align:right;border-top:1px solid #ddd"><strong>${(totalCents / 100).toFixed(2)} €</strong></td></tr>
        </table>
        <p style="color:#666;font-size:13px">SIN Shop Center – diese E-Mail wurde automatisch erstellt.</p>
      </div>
    `,
  })
}
