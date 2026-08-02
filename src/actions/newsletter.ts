'use server'

// Purpose: Rate-limited newsletter double-opt-in.
// Raw tokens exist only in the confirmation email; the database stores hashes.

import { createHash, randomBytes } from 'node:crypto'

import { FROM_EMAIL, getResend } from '@/lib/email-constants'
import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export interface NewsletterState {
  ok: boolean
  message: string
}

const GENERIC_SUCCESS =
  'Bitte prüfe dein Postfach und bestätige die Anmeldung über den zugesandten Link.'
const RESEND_COOLDOWN_MS = 10 * 60 * 1000

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function appUrl(): string {
  const raw = String(process.env.NEXT_PUBLIC_APP_URL || '').trim()
  const parsed = new URL(raw)
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production')
  }
  parsed.pathname = ''
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  // Honeypot bots receive the same response but create no record.
  if (String(formData.get('website') ?? '').trim()) {
    return { ok: true, message: GENERIC_SUCCESS }
  }

  try {
    await checkRateLimit('newsletter-subscribe', { limit: 5, windowSec: 3600 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, message: 'Zu viele Anfragen. Bitte versuche es später erneut.' }
    }
    console.error('[newsletter] rate limit failed:', error)
    return { ok: false, message: 'Anmeldung vorübergehend nicht möglich.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }

  const admin = createAdminClient()
  const { data: existing, error: readError } = await admin
    .from('newsletter_subscribers')
    .select('id, status, confirmation_sent_at')
    .eq('email', email)
    .maybeSingle()

  if (readError) {
    console.error('[newsletter] subscriber lookup failed:', readError.message)
    return { ok: false, message: 'Anmeldung vorübergehend nicht möglich.' }
  }

  // Do not reveal whether an address is already confirmed.
  if (existing?.status === 'confirmed') {
    return { ok: true, message: GENERIC_SUCCESS }
  }

  if (existing?.confirmation_sent_at) {
    const sentAt = new Date(existing.confirmation_sent_at).getTime()
    if (Number.isFinite(sentAt) && Date.now() - sentAt < RESEND_COOLDOWN_MS) {
      return { ok: true, message: GENERIC_SUCCESS }
    }
  }

  const confirmationToken = randomBytes(32).toString('base64url')
  const unsubscribeToken = randomBytes(32).toString('base64url')
  const confirmationTokenHash = tokenHash(confirmationToken)
  const unsubscribeTokenHash = tokenHash(unsubscribeToken)
  const now = new Date().toISOString()

  let subscriberId = existing?.id
  if (subscriberId) {
    const { error } = await admin
      .from('newsletter_subscribers')
      .update({
        status: 'pending',
        confirmation_token_hash: confirmationTokenHash,
        unsubscribe_token_hash: unsubscribeTokenHash,
        confirmation_sent_at: null,
        confirmed_at: null,
        unsubscribed_at: null,
        updated_at: now,
      })
      .eq('id', subscriberId)
    if (error) {
      console.error('[newsletter] subscriber update failed:', error.message)
      return { ok: false, message: 'Anmeldung vorübergehend nicht möglich.' }
    }
  } else {
    const { data, error } = await admin
      .from('newsletter_subscribers')
      .insert({
        email,
        status: 'pending',
        confirmation_token_hash: confirmationTokenHash,
        unsubscribe_token_hash: unsubscribeTokenHash,
      })
      .select('id')
      .single()
    if (error || !data) {
      // A concurrent identical request may have won the unique-email race.
      if (error?.code === '23505') return { ok: true, message: GENERIC_SUCCESS }
      console.error('[newsletter] subscriber insert failed:', error?.message)
      return { ok: false, message: 'Anmeldung vorübergehend nicht möglich.' }
    }
    subscriberId = data.id
  }

  try {
    const baseUrl = appUrl()
    const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(confirmationToken)}`
    const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Newsletter-Anmeldung bestätigen',
      text: [
        'Bitte bestätige deine Newsletter-Anmeldung:',
        confirmUrl,
        '',
        'Falls du diese Anfrage nicht gestellt hast, ignoriere diese Nachricht oder nutze:',
        unsubscribeUrl,
      ].join('\n'),
      html: [
        '<h1>Newsletter-Anmeldung bestätigen</h1>',
        '<p>Bestätige deine Anmeldung über den folgenden Link:</p>',
        `<p><a href="${confirmUrl}">Anmeldung bestätigen</a></p>`,
        '<p>Falls du diese Anfrage nicht gestellt hast, kannst du sie ignorieren.</p>',
        `<p><a href="${unsubscribeUrl}">Anmeldung verwerfen</a></p>`,
      ].join(''),
    })
    if (result.error) throw new Error(result.error.message)

    const { error: sentError } = await admin
      .from('newsletter_subscribers')
      .update({ confirmation_sent_at: now, updated_at: now })
      .eq('id', subscriberId)
    if (sentError) {
      console.error('[newsletter] confirmation timestamp failed:', sentError.message)
    }
  } catch (error) {
    console.error('[newsletter] confirmation email failed:', error)
    return { ok: false, message: 'Bestätigungs-E-Mail konnte nicht gesendet werden.' }
  }

  return { ok: true, message: GENERIC_SUCCESS }
}
