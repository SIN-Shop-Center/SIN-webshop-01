// Purpose: Server action for guest order tracking
// Docs: AGENTS.md

'use server'

import { createClient } from '@/lib/supabase/server'

export async function trackOrder({ orderId, email }: { orderId: string; email: string }) {
  if (!orderId || !email) {
    return { error: 'Bitte fülle beide Felder aus.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, created_at, total')
    .eq('id', orderId)
    .ilike('customer_email', email.trim())
    .maybeSingle()

  if (error) {
    console.error('[track-order] Fehler:', error.message)
    return { error: 'Suche fehlgeschlagen. Bitte versuche es erneut.' }
  }
  if (!data) {
    return { error: 'Keine Bestellung mit diesen Angaben gefunden. Prüfe Bestellnummer und E-Mail.' }
  }
  return { order: data }
}
