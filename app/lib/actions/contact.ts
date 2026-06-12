// Purpose: Contact form server action — saves to contact_messages table
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// SECURITY: Uses admin client for insert (anon has no write access).
// Honeypot field (website) silently rejects bots.

'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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
  if (formData.get(HONEYPOT_FIELD)) {
    return { ok: true, success: 'Danke für deine Nachricht!' }
  }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const subject = String(formData.get('subject') ?? '').trim().slice(0, 200)
  const message = String(formData.get('message') ?? '').trim()

  if (!name || name.length < 2) {
    return { ok: false, error: 'Bitte gib deinen Namen ein (mindestens 2 Zeichen).' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }
  if (!message || message.length < 10) {
    return { ok: false, error: 'Bitte schreibe eine Nachricht (mindestens 10 Zeichen).' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    subject: subject || null,
    message,
  })

  if (error) {
    console.error('Contact insert error:', error.message)
    return { ok: false, error: 'Senden fehlgeschlagen. Bitte versuche es später erneut.' }
  }

  return { ok: true, success: 'Danke für deine Nachricht! Wir melden uns innerhalb von 24 Stunden (werktags).' }
}
