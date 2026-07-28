import 'server-only'

import type { ShippingAddress } from './template-types'

const BRAND_GREEN = '#047857'
const BRAND_BG = '#f9fafb'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#6b7280'
const BORDER_COLOR = '#e5e7eb'

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function appBaseUrl(): string {
  const fallback = 'https://shopsin.delqhi.com'
  try {
    const url = new URL(String(process.env.NEXT_PUBLIC_APP_URL || fallback))
    if (url.protocol !== 'https:') return fallback
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export function internalUrl(pathname: string): string {
  const url = new URL(pathname, `${appBaseUrl()}/`)
  return escapeHtml(url.toString())
}

export function safeExternalHttpsUrl(raw: string): string {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') throw new Error('HTTPS required')
    return escapeHtml(url.toString())
  } catch {
    return internalUrl('/bestellung-verfolgen')
  }
}

export function shortId(id: string): string {
  return escapeHtml(id.replaceAll('-', '').slice(0, 8).toUpperCase())
}

export function formatCurrency(cents: number, currency = 'EUR'): string {
  const amount = Number.isFinite(Number(cents)) ? Number(cents) : 0
  const normalizedCurrency = /^[A-Z]{3}$/i.test(currency) ? currency.toUpperCase() : 'EUR'
  try {
    return escapeHtml(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: normalizedCurrency,
      }).format(amount / 100),
    )
  } catch {
    return `${(amount / 100).toFixed(2)} ${escapeHtml(normalizedCurrency)}`
  }
}

export function formatAddress(addr: ShippingAddress | null | undefined): string {
  if (!addr?.address) return '<em>Keine Lieferadresse verfügbar</em>'
  const address = addr.address
  return [
    addr.name,
    address.line1,
    address.line2,
    `${address.postal_code ?? ''} ${address.city ?? ''}`.trim(),
    address.state,
    address.country,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .map(escapeHtml)
    .join('<br/>')
}

function header(): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_GREEN};border-radius:8px 8px 0 0">
      <tr><td style="padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">ShopSIN</h1>
      </td></tr>
    </table>`
}

function footer(): string {
  const base = appBaseUrl()
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};border-radius:0 0 8px 8px;border-top:1px solid ${BORDER_COLOR}">
      <tr><td style="padding:20px 32px;text-align:center">
        <p style="margin:0;font-size:12px;color:${TEXT_SECONDARY}">&copy; ${new Date().getFullYear()} ShopSIN</p>
        <p style="margin:8px 0 0;font-size:12px;color:${TEXT_SECONDARY}">
          <a href="${escapeHtml(`${base}/impressum`)}" style="color:${BRAND_GREEN}">Impressum</a>
          &nbsp;&middot;&nbsp;
          <a href="${escapeHtml(`${base}/agb`)}" style="color:${BRAND_GREEN}">AGB</a>
          &nbsp;&middot;&nbsp;
          <a href="${escapeHtml(`${base}/widerrufsrecht`)}" style="color:${BRAND_GREEN}">Widerrufsrecht</a>
          &nbsp;&middot;&nbsp;
          <a href="${escapeHtml(`${base}/datenschutz`)}" style="color:${BRAND_GREEN}">Datenschutz</a>
        </p>
      </td></tr>
    </table>`
}

export function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto">
      <tr><td style="border-radius:6px;background:${BRAND_GREEN}">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px">${escapeHtml(label)}</a>
      </td></tr>
    </table>`
}

export function wrap(content: string): string {
  return `<!DOCTYPE html>
    <html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px"><tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
          ${header()}
          <tr><td style="padding:32px">${content}</td></tr>
          ${footer()}
        </table>
      </td></tr></table>
    </body></html>`
}
