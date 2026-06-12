'use server'

// Purpose: Newsletter subscription server action
// Docs: AGENTS.md
// DB: public.newsletter_subscribers (CREATE TABLE siehe scripts/supabase/setup-newsletter.sql)

import { createDataClient } from '@/lib/supabase/data-client'

interface NewsletterState {
  ok: boolean
  message: string
}

export async function subscribeNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }

  const supabase = createDataClient()
  const { error } = await supabase.from('newsletter_subscribers').insert({ email })

  if (error) {
    if (error.code === '23505') {
      return { ok: true, message: 'Du bist bereits angemeldet – danke!' }
    }
    console.error('Newsletter error:', error.message)
    return { ok: false, message: 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.' }
  }

  return { ok: true, message: 'Danke! Du bist angemeldet.' }
}
