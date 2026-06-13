/**
 * Purpose: Inline HTML email templates for ShopSIN order lifecycle + welcome
 * Docs: emails.doc.md
 *
 * All templates are responsive, use SIN green (#047857), and include German
 * legal footer (Impressum, AGB, Widerruf). No template engine — pure string
 * interpolation. Keep CSS inline for email-client compatibility.
 */

const BRAND_GREEN = '#047857'
const BRAND_GREEN_LIGHT = '#059669'
const BRAND_BG = '#f9fafb'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#6b7280'
const BORDER_COLOR = '#e5e7eb'

type OrderItem = {
  title: string
  quantity: number
  unit_amount: number
}

type OrderData = {
  orderId: string
  items: OrderItem[]
  totalCents: number
  currency?: string
  shippingAddress?: ShippingAddress | null
  email?: string
}

type ShippingAddress = {
  name: string | null
  address: {
    line1: string | null
    line2?: string | null
    city: string | null
    state?: string | null
    postal_code: string | null
    country: string | null
  } | null
  phone?: string | null
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

function formatCurrency(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

function formatAddress(addr: ShippingAddress | null | undefined): string {
  if (!addr?.address) return '<em>Wird nachgereicht</em>'
  const a = addr.address
  const parts = [
    addr.name ?? '',
    a.line1 ?? '',
    a.line2 ?? '',
    `${a.postal_code ?? ''} ${a.city ?? ''}`.trim(),
    a.state ?? '',
    a.country ?? '',
  ].filter(Boolean)
  return parts.join('<br/>')
}

function header(): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_GREEN};border-radius:8px 8px 0 0">
      <tr>
        <td style="padding:24px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px">
            ShopSIN
          </h1>
        </td>
      </tr>
    </table>`
}

function footer(includeUnsubscribe = false): string {
  const currentYear = new Date().getFullYear()
  const unsubscribeHtml = includeUnsubscribe
    ? `<p style="margin:8px 0 0;font-size:11px;color:${TEXT_SECONDARY}">
        Du erhältst diese E-Mail weil du dich für den ShopSIN Newsletter angemeldet hast.
        <a href="https://shopsin.delqhi.com/newsletter/unsubscribe" style="color:${BRAND_GREEN}">Abmelden</a>
      </p>`
    : ''
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};border-radius:0 0 8px 8px;border-top:1px solid ${BORDER_COLOR}">
      <tr>
        <td style="padding:20px 32px;text-align:center">
          <p style="margin:0;font-size:12px;color:${TEXT_SECONDARY}">
            &copy; ${currentYear} ShopSIN &mdash; Alle Rechte vorbehalten.
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:${TEXT_SECONDARY}">
            <a href="https://shopsin.delqhi.com/impressum" style="color:${BRAND_GREEN}">Impressum</a>
            &nbsp;&middot;&nbsp;
            <a href="https://shopsin.delqhi.com/agb" style="color:${BRAND_GREEN}">AGB</a>
            &nbsp;&middot;&nbsp;
            <a href="https://shopsin.delqhi.com/widerruf" style="color:${BRAND_GREEN}">Widerrufsrecht</a>
          </p>
          ${unsubscribeHtml}
        </td>
      </tr>
    </table>`
}

function itemsTable(items: OrderItem[], totalCents: number, currency = 'EUR'): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};color:${TEXT_PRIMARY};font-size:14px">${i.title}</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:center;color:${TEXT_PRIMARY};font-size:14px">${i.quantity}x</td>
        <td style="padding:10px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:right;color:${TEXT_PRIMARY};font-size:14px;white-space:nowrap">${formatCurrency(i.unit_amount * i.quantity, currency)}</td>
      </tr>`,
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${BORDER_COLOR};border-radius:6px;overflow:hidden">
      <thead>
        <tr style="background:${BRAND_BG}">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:${TEXT_SECONDARY};font-weight:600">Artikel</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:${TEXT_SECONDARY};font-weight:600">Menge</th>
          <th style="padding:10px 12px;text-align:right;font-size:13px;color:${TEXT_SECONDARY};font-weight:600">Preis</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="2" style="padding:12px;border-top:2px solid ${BRAND_GREEN};font-weight:700;color:${TEXT_PRIMARY};font-size:14px">Gesamt (inkl. Versand)</td>
          <td style="padding:12px;border-top:2px solid ${BRAND_GREEN};text-align:right;font-weight:700;color:${BRAND_GREEN};font-size:16px;white-space:nowrap">${formatCurrency(totalCents, currency)}</td>
        </tr>
      </tbody>
    </table>`
}

function ctaButton(label: string, url: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px auto">
      <tr>
        <td style="border-radius:6px;background:${BRAND_GREEN}">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;border-radius:6px">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

function wrap(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
              ${header()}
              <tr>
                <td style="padding:32px">
                  ${content}
                </td>
              </tr>
              ${footer()}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`
}

export function orderConfirmationHtml(order: OrderData): string {
  const currency = order.currency ?? 'EUR'
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Danke für deine Bestellung! 🎉</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">
      Bestellnummer: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong>
    </p>
    ${itemsTable(order.items, order.totalCents, currency)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:12px">
          <h3 style="margin:0 0 8px;font-size:14px;color:${TEXT_SECONDARY}">Lieferadresse</h3>
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.5">
            ${formatAddress(order.shippingAddress)}
          </p>
        </td>
        <td style="vertical-align:top;width:50%;padding-left:12px">
          <h3 style="margin:0 0 8px;font-size:14px;color:${TEXT_SECONDARY}">Hinweis zur Lieferung</h3>
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.5">
            Die Lieferung erfolgt aus unserem internationalen Lager.<br/>
            Übliche Lieferzeit: <strong>7–15 Werktage</strong>.
          </p>
        </td>
      </tr>
    </table>
    ${ctaButton('Bestellung ansehen', `https://shopsin.delqhi.com/account/orders/${order.orderId}`)}`
  return wrap(content)
}

export function orderShippedHtml(order: OrderData, trackingUrl: string): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Deine Bestellung ist unterwegs! 📦</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">
      Bestellnummer: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;padding:16px;background:${BRAND_BG};border-radius:6px">
      <tr>
        <td>
          <p style="margin:0 0 8px;font-size:14px;color:${TEXT_SECONDARY}">Sendungsverfolgung</p>
          <p style="margin:0;font-size:14px">
            <a href="${trackingUrl}" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none">
              ${trackingUrl}
            </a>
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">
      Deine Bestellung wurde an den Versanddienstleister übergeben. Du kannst
      den Lieferstatus jederzeit über den Link oben verfolgen.
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:${TEXT_SECONDARY}">
      Hinweis: Die Lieferung aus dem internationalen Lager dauert in der Regel 7–15 Werktage.
    </p>
    ${ctaButton('Bestellung ansehen', `https://shopsin.delqhi.com/account/orders/${order.orderId}`)}`
  return wrap(content)
}

export function orderDeliveredHtml(order: OrderData): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Deine Bestellung wurde zugestellt! ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">
      Bestellnummer: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong>
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">
      Deine Bestellung sollte nun bei dir angekommen sein. Wir hoffen, dass
      dir die Artikel gefallen! Falls etwas nicht stimmt, kannst du innerhalb
      von 14 Tagen vom Widerrufsrecht Gebrauch machen.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;padding:16px;background:${BRAND_BG};border-radius:6px">
      <tr>
        <td style="text-align:center">
          <p style="margin:0 0 8px;font-size:14px;color:${TEXT_PRIMARY};font-weight:600">
            Wie hat dir die Bestellung gefallen?
          </p>
          <p style="margin:0;font-size:13px;color:${TEXT_SECONDARY}">
            <a href="https://shopsin.delqhi.com/account/orders/${order.orderId}/review" style="color:${BRAND_GREEN};font-weight:600;text-decoration:none">
              Bewertung abgeben
            </a>
          </p>
        </td>
      </tr>
    </table>
    ${ctaButton('Bestellung ansehen', `https://shopsin.delqhi.com/account/orders/${order.orderId}`)}`
  return wrap(content)
}

export function welcomeHtml(userName: string): string {
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${TEXT_PRIMARY}">Willkommen bei ShopSIN! 🌿</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">
      Hallo ${userName || ''},<br/><br/>
      schön, dass du dabei bist! Bei ShopSIN findest du sorgfältig ausgewählte
      Produkte zu fairen Preisen. Hier ist, was dich erwartet:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
      <tr>
        <td style="padding:12px 16px;background:${BRAND_BG};border-radius:6px 6px 0 0;border-bottom:1px solid ${BORDER_COLOR}">
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};font-weight:600">🚚 Kostenloser Versand</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY}">Ab 50 € Bestellwert liefern wir gratis</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:${BRAND_BG};border-bottom:1px solid ${BORDER_COLOR}">
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};font-weight:600">↩️ 14 Tage Widerrufsrecht</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY}">Geld zurück, wenn es nicht passt</p>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:${BRAND_BG};border-radius:0 0 6px 6px">
          <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};font-weight:600">🎁 Exklusive Angebote</p>
          <p style="margin:4px 0 0;font-size:13px;color:${TEXT_SECONDARY}">Newsletter-Abonnenten erhalten als Erstes Zugriff</p>
        </td>
      </tr>
    </table>
    ${ctaButton('Jetzt stöbern', 'https://shopsin.delqhi.com/shop')}`
  return wrap(content)
}

export type { OrderData, OrderItem, ShippingAddress }
