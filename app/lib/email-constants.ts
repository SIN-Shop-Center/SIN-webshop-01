// Purpose: Shared email constants (Step 8 refactor)
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// Extracted from email.ts so server actions (contact.ts) can reuse the
// FROM_EMAIL and FOOTER_COMPANY constants without re-instantiating Resend.

import 'server-only'

import { Resend } from 'resend'

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'ShopSIN <onboarding@resend.dev>'
export const FOOTER_COMPANY = 'ShopSIN'

/**
 * Lazy-initialized Resend client. Throws if RESEND_API_KEY is not set.
 * Use this in server actions that send email (e.g. contact form).
 */
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  return new Resend(key)
}
