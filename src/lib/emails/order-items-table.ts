import 'server-only'

import type { OrderItem } from './template-types'
import { escapeHtml, formatCurrency } from './template-layout'

const BRAND_GREEN = '#047857'
const BRAND_BG = '#f9fafb'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#6b7280'
const BORDER_COLOR = '#e5e7eb'

export function itemsTable(items: OrderItem[], totalCents: number, currency = 'EUR'): string {
  const rows = items
    .map((item) => {
      const quantity = Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0
        ? Number(item.quantity)
        : 1
      const unitAmount = Number.isInteger(Number(item.unit_amount)) && Number(item.unit_amount) >= 0
        ? Number(item.unit_amount)
        : 0
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};color:${TEXT_PRIMARY};font-size:14px">${escapeHtml(item.title)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:center;color:${TEXT_PRIMARY};font-size:14px">${quantity}x</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:right;color:${TEXT_PRIMARY};font-size:14px;white-space:nowrap">${formatCurrency(unitAmount * quantity, currency)}</td>
        </tr>`
    })
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER_COLOR};border-radius:6px;overflow:hidden">
      <thead><tr style="background:${BRAND_BG}">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:${TEXT_SECONDARY}">Artikel</th>
        <th style="padding:10px 12px;text-align:center;font-size:13px;color:${TEXT_SECONDARY}">Menge</th>
        <th style="padding:10px 12px;text-align:right;font-size:13px;color:${TEXT_SECONDARY}">Preis</th>
      </tr></thead>
      <tbody>${rows}
        <tr>
          <td colspan="2" style="padding:12px;border-top:2px solid ${BRAND_GREEN};font-weight:700;color:${TEXT_PRIMARY};font-size:14px">Gesamt einschließlich ausgewiesener Versandkosten</td>
          <td style="padding:12px;border-top:2px solid ${BRAND_GREEN};text-align:right;font-weight:700;color:${BRAND_GREEN};font-size:16px;white-space:nowrap">${formatCurrency(totalCents, currency)}</td>
        </tr>
      </tbody>
    </table>`
}
