// Purpose: Server action — manual fulfillment retry for admins
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'
import { createAdminClient } from '@/lib/supabase/admin'

export async function retryFulfillment(orderId: string) {
  await requireAdmin()
  const admin = createAdminClient()
  const { data: order, error: readError } = await admin
    .from('orders')
    .select('id, fulfillment_status')
    .eq('id', orderId)
    .maybeSingle()
  if (readError) return { error: readError.message }
  if (!order || !['failed', 'pending'].includes(order.fulfillment_status)) {
    return { error: 'Bestellung ist nicht erneut versendbar.' }
  }

  const { error: resetError } = await admin
    .from('orders')
    .update({ fulfillment_attempts: 0, fulfillment_status: 'pending', fulfillment_error: null })
    .eq('id', orderId)
  if (resetError) return { error: resetError.message }

  const result = await submitOrderToCj(orderId)

  revalidatePath('/admin/fulfillment')
  return result.ok ? { ok: true } : { error: result.error }
}
