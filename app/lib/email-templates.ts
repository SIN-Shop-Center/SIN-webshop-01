// Purpose: Transaktionale E-Mail-Templates (Issue #33 + #39 + #45)
// Docs: alle Bestell-/Refund-/Restock-Mails in einem File.
//
// Inline-HTML (kein React Email / MJML), damit keine Build-Komplexität.
// `wrap()` liefert das konsistente Layout (Header/Footer).

type OrderItem = { title: string; quantity: number; unitPriceCents: number }

const wrap = (content: string) => `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#1a1a1a;padding:20px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">Delqhi Shop</span>
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a1a;font-size:14px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eeeeee;color:#888888;font-size:12px;">
          Delqhi Shop · <a href="https://delqhi.com/impressum" style="color:#888888;">Impressum</a> ·
          <a href="https://delqhi.com/datenschutz" style="color:#888888;">Datenschutz</a> ·
          <a href="https://delqhi.com/widerruf" style="color:#888888;">Widerrufsbelehrung</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const itemRows = (items: OrderItem[]) =>
  items
    .map(
      (i) => `
  <tr>
    <td style="padding:8px 0;border-bottom:1px solid #eeeeee;">${i.title}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eeeeee;text-align:center;">${i.quantity}x</td>
    <td style="padding:8px 0;border-bottom:1px solid #eeeeee;text-align:right;">
      ${((i.unitPriceCents * i.quantity) / 100).toFixed(2).replace('.', ',')} €
    </td>
  </tr>`,
    )
    .join('')

export function orderConfirmationHtml(opts: {
  orderId: string
  items: OrderItem[]
  totalCents: number
}) {
  return wrap(`
    <h1 style="font-size:20px;margin:0 0 8px;">Vielen Dank für deine Bestellung!</h1>
    <p style="margin:0 0 24px;">Bestellnummer: <strong>${opts.orderId.slice(0, 8).toUpperCase()}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
      ${itemRows(opts.items)}
      <tr>
        <td colspan="2" style="padding:12px 0;font-weight:bold;">Gesamt (inkl. MwSt.)</td>
        <td style="padding:12px 0;text-align:right;font-weight:bold;">
          ${(opts.totalCents / 100).toFixed(2).replace('.', ',')} €
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;">Wir benachrichtigen dich, sobald deine Bestellung versandt wurde.
    Lieferzeit: 7–14 Werktage.</p>`)
}

export function shippingNotificationHtml(opts: {
  orderId: string
  trackingNumber: string
  trackingUrl?: string
}) {
  const trackLink = opts.trackingUrl
    ? `<a href="${opts.trackingUrl}" style="color:#1a1a1a;">${opts.trackingNumber}</a>`
    : opts.trackingNumber
  return wrap(`
    <h1 style="font-size:20px;margin:0 0 8px;">Deine Bestellung ist unterwegs!</h1>
    <p style="margin:0 0 16px;">Bestellnummer: <strong>${opts.orderId.slice(0, 8).toUpperCase()}</strong></p>
    <p style="margin:0;">Sendungsnummer: <strong>${trackLink}</strong></p>`)
}

export function refundConfirmationHtml(opts: {
  orderId: string
  amountCents: number
}) {
  return wrap(`
    <h1 style="font-size:20px;margin:0 0 8px;">Erstattung veranlasst</h1>
    <p style="margin:0;">Für Bestellung <strong>${opts.orderId.slice(0, 8).toUpperCase()}</strong>
    wurden <strong>${(opts.amountCents / 100).toFixed(2).replace('.', ',')} €</strong> erstattet.
    Die Gutschrift erscheint je nach Bank innerhalb von 5–10 Werktagen.</p>`)
}

export function restockNotificationHtml(opts: {
  productTitle: string
  productSlug: string
  productUrl?: string
}) {
  const url =
    opts.productUrl ??
    `https://delqhi.com/produkte/${opts.productSlug}`
  return wrap(`
    <h1 style="font-size:20px;margin:0 0 8px;">Wieder verfügbar!</h1>
    <p style="margin:0 0 16px;"><strong>${opts.productTitle}</strong> ist wieder auf Lager.</p>
    <p style="margin:0;"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:10px 20px;border-radius:4px;text-decoration:none;">Jetzt ansehen</a></p>`)
}
