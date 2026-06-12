// Purpose: Newsletter-Versand an alle Subscriber via Resend Batch (Issue #15)
// Docs: https://resend.com/docs/api-reference/emails/send-batch-emails
// Rate-Limit Resend: 100 Mails/Batch, 2 req/s — daher chunked mit Delay.

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'ShopSIN <news@delqhi.com>'
const BATCH_SIZE = 100
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

interface SendResult {
  total: number
  sent: number
  failed: number
}

export async function sendNewsletterToAll(params: {
  subject: string
  html: string
}): Promise<SendResult> {
  const supabase = createAdminClient()
  const { data: subscribers, error } = await supabase
    .from('newsletter_subscribers')
    .select('email, unsubscribe_token')
    .is('unsubscribed_at', null)
  if (error) throw error

  const result: SendResult = { total: subscribers?.length ?? 0, sent: 0, failed: 0 }

  for (let i = 0; i < (subscribers?.length ?? 0); i += BATCH_SIZE) {
    const batch = (subscribers ?? []).slice(i, i + BATCH_SIZE).map((sub) => {
      const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${sub.unsubscribe_token}`
      return {
        from: FROM,
        to: [sub.email],
        subject: params.subject,
        html: `${params.html}<hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5" /><p style="font-size:12px;color:#888">Du erhältst diese E-Mail, weil du dich bei ShopSIN angemeldet hast. <a href="${unsubUrl}">Abmelden</a></p>`,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    const { error: batchError } = await resend.batch.send(batch)
    if (batchError) {
      console.error('[newsletter] batch failed:', batchError)
      result.failed += batch.length
    } else {
      result.sent += batch.length
    }
    // Resend-Rate-Limit (2 req/s) respektieren
    if (i + BATCH_SIZE < (subscribers?.length ?? 0)) {
      await new Promise((r) => setTimeout(r, 600))
    }
  }

  return result
}
