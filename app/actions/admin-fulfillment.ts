// Purpose: Server action — manual fulfillment retry for admins
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitOrderToCj } from '@/lib/fulfillment/submit-order'

export async function retryFulfillment(orderId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht angemeldet.' }

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) return { error: 'Keine Berechtigung.' }

  const admin = createAdminClient()
  await admin
    .from('orders')
    .update({ fulfillment_attempts: 0, fulfillment_status: 'pending' })
    .eq('id', orderId)

  const result = await submitOrderToCj(orderId)

  revalidatePath('/admin/fulfillment')
  return result.ok ? { ok: true } : { error: result.error }
}
