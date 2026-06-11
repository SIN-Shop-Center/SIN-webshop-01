// Purpose: Contact form server action (Step 8 of migration + Issue #41 rate-limit)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
//
// Validates input, stores message in Supabase, sends notification email
// to kontakt@delqhi.com via Resend.

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FOOTER_COMPANY, FROM_EMAIL } from '@/lib/email-constants'
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'

export interface ContactFormState {
  ok: boolean
  error?: string
  success?: string
}

export async function submitContactForm(formData: FormData): Promise<ContactFormState> {
  // Issue #41: Rate-Limit 3/h pro IP gegen Spam-Flut
  try {
    await checkRateLimit('contact', { limit: 3, windowSec: 3600 })
  } catch (e) {
    if (e instanceof RateLimitError) {
      return {
        ok: false,
        error: 'Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.',
      }
    }
    throw e
  }

  // Honeypot: Bots füllen das versteckte Feld — still als Erfolg quittieren
  if (formData.get('website')) {
    return { ok: true, success: 'Vielen Dank für deine Nachricht!' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim().slice(0, 200)
  const message = String(formData.get('message') ?? '').trim()

  if (!name || name.length < 2) {
    return { ok: false, error: 'Bitte gib deinen Namen an.' }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Bitte gib eine gültige E-Mail-Adresse an.' }
  }
  if (!message || message.length < 10) {
    return { ok: false, error: 'Bitte schreibe mindestens 10 Zeichen.' }
  }
  if (message.length > 5000) {
    return { ok: false, error: 'Die Nachricht ist zu lang (max. 5000 Zeichen).' }
  }

  // Speichern in DB
  const supabase = createAdminClient()
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name,
    email,
    subject: subject || null,
    message,
    status: 'new',
  })
  if (dbError) {
    return { ok: false, error: 'Speichern fehlgeschlagen. Bitte versuche es später erneut.' }
  }

  // Benachrichtigung an Shop-Inhaber
  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to: 'kontakt@delqhi.com',
      replyTo: email,
      subject: `[Kontaktformular] ${subject || 'Neue Nachricht'} — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h1 style="font-size:18px">Neue Kontaktanfrage</h1>
          <p><strong>Von:</strong> ${name} &lt;${email}&gt;</p>
          ${subject ? `<p><strong>Betreff:</strong> ${subject}</p>` : ''}
          <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
          <pre style="white-space:pre-wrap;font-family:inherit">${message}</pre>
          <hr style="margin:16px 0;border:none;border-top:1px solid #ddd" />
          <p style="color:#666;font-size:13px">${FOOTER_COMPANY} – Kontaktformular</p>
        </div>
      `,
    })
  } catch (e) {
    // DB-Eintrag ist gespeichert — Mail-Fehler nur loggen
    console.error('Contact notification email failed:', e)
  }

  return { ok: true, success: 'Danke! Wir melden uns innerhalb von 24 Stunden.' }
}
