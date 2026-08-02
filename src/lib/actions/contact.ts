// Purpose: Contact form server action — saves to contact_messages table
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// SECURITY: Uses admin client for insert (anon has no write access).
// Honeypot field (website) silently rejects bots.

'use server'

import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const HONEYPOT_FIELD = 'website'

export interface ContactFormState {
  ok: boolean
  error?: string
  success?: string
}

export async function submitContactForm(
  formData: FormData,
): Promise<ContactFormState> {
  // Honeypot: if bot filled the hidden field, silently accept but discard
  if (String(formData.get(HONEYPOT_FIELD) ?? '').trim()) {
    return { ok: true, success: 'Danke für deine Nachricht!' }
  }

  try {
    await checkRateLimit('contact-form', { limit: 5, windowSec: 3600 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: 'Zu viele Nachrichten. Bitte versuche es später erneut.' }
    }
    console.error('[contact] rate limit failed:', error)
    return { ok: false, error: 'Senden vorübergehend nicht möglich.' }
  }

  const name = String(formData.get('name') ?? '').trim().slice(0, 100)
  const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 254)
  const subject = String(formData.get('subject') ?? '').trim().slice(0, 200)
  const message = String(formData.get('message') ?? '').trim().slice(0, 5000)

  if (!name || name.length < 2) {
    return { ok: false, error: 'Bitte gib deinen Namen ein (mindestens 2 Zeichen).' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }
  if (!message || message.length < 10) {
    return { ok: false, error: 'Bitte schreibe eine Nachricht (mindestens 10 Zeichen).' }
  }

  let userId: string | null = null
  try {
    const session = await createClient()
    const {
      data: { user },
    } = await session.auth.getUser()
    userId = user?.id ?? null
  } catch {
    // Guest contact requests are supported; auth lookup is optional.
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').insert({
    user_id: userId,
    name,
    email,
    subject: subject || null,
    message,
  })

  if (error) {
    console.error('Contact insert error:', error.message)
    return { ok: false, error: 'Senden fehlgeschlagen. Bitte versuche es später erneut.' }
  }

  return { ok: true, success: 'Danke für deine Nachricht! Wir melden uns so bald wie möglich.' }
}
