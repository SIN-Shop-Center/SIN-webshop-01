// Purpose: Server action for back-in-stock email subscription
// Docs: AGENTS.md

'use server'

import { createClient } from '@/lib/supabase/server'

export async function subscribeBackInStock({ productId, email }: { productId: string; email: string }) {
  const trimmed = email.trim().toLowerCase()
  if (!productId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: 'Bitte gib eine gültige E-Mail-Adresse ein.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stock_notifications')
    .upsert({ product_id: productId, email: trimmed }, { onConflict: 'product_id,email' })

  if (error) {
    console.error('[back-in-stock] Fehler:', error.message)
    return { error: 'Das hat nicht geklappt. Bitte versuche es erneut.' }
  }
  return { ok: true }
}
