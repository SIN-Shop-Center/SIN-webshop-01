// Purpose: Rate-limited guest order tracking with short or full order reference.

'use server'

import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

const REFERENCE_RE = /^(?:[0-9a-fA-F]{8}|[0-9a-fA-F-]{36})$/

export interface GuestTrackingOrder {
  id: string
  status: string
  created_at: string
  amount_total: number
  currency: string
  tracking_number: string | null
}

export async function trackOrder({
  orderId,
  email,
}: {
  orderId: string
  email: string
}): Promise<{ order?: GuestTrackingOrder; error?: string }> {
  try {
    await checkRateLimit('guest-order-tracking', { limit: 10, windowSec: 15 * 60 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: 'Zu viele Suchanfragen. Bitte versuche es später erneut.' }
    }
    console.error('[track-order] rate limit failed:', error)
    return { error: 'Suche vorübergehend nicht möglich.' }
  }

  const reference = orderId.trim()
  const normalizedEmail = email.trim().toLowerCase()
  if (!REFERENCE_RE.test(reference) || normalizedEmail.length > 254) {
    return { error: 'Keine Bestellung mit diesen Angaben gefunden.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: 'Keine Bestellung mit diesen Angaben gefunden.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('lookup_order_tracking', {
    p_reference: reference,
    p_email: normalizedEmail,
  })

  if (error) {
    console.error('[track-order] lookup failed:', error.message)
    return { error: 'Suche vorübergehend nicht möglich.' }
  }

  // A short prefix must resolve to exactly one order. Never guess if two rows
  // happen to share the same first eight hexadecimal characters.
  if (!Array.isArray(data) || data.length !== 1) {
    return { error: 'Keine Bestellung mit diesen Angaben gefunden.' }
  }

  const row = data[0]
  return {
    order: {
      id: String(row.order_id),
      status: String(row.order_status || 'paid'),
      created_at: String(row.created_at),
      amount_total: Number(row.amount_total || 0),
      currency: String(row.currency || 'EUR').toUpperCase(),
      tracking_number: row.tracking_number ? String(row.tracking_number) : null,
    },
  }
}
