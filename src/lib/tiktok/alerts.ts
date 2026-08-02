// Purpose: Fehler-Alerting — E-Mail bei failed-Publishes und cj_failed-Orders
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
// Nutzt das bestehende Resend-Setup des Webshops.

import 'server-only'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const ALERT_EMAIL = process.env.ALERT_EMAIL ?? ''
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'alerts@sin-shop.example.com'

export async function sendPipelineAlert(params: {
  subject: string
  errors: string[]
}): Promise<void> {
  if (!RESEND_API_KEY || !ALERT_EMAIL || params.errors.length === 0) return

  const items = params.errors.map((e) => `<li>${e}</li>`).join('')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ALERT_EMAIL,
      subject: `[SIN TikTok Pipeline] ${params.subject}`,
      html: `<p>Fehler in der TikTok-Pipeline:</p><ul>${items}</ul><p>Details: /admin/tiktok</p>`,
    }),
  }).catch(() => {
    // Alerting darf den Cron nie crashen
  })
}
