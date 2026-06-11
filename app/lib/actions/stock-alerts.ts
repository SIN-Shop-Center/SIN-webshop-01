'use server'

// Purpose: Stock-Alert Subscriptions (Issue #53)
// Docs: scripts/supabase/setup-stock-alerts.sql
//
// Customer trägt Email ein → cj-sync-Cron triggert beim Restock Email.
// Rate-Limit: 5/Std pro IP (Brute-Force-Schutz).

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

export async function subscribeStockAlert(productId: string, email: string) {
  await checkRateLimit('stock-alert', { limit: 5, windowSec: 3600 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ungültige E-Mail')
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('stock_alerts')
    .upsert(
      { product_id: productId, email },
      { onConflict: 'product_id,email' },
    )
  if (error) throw error
}
