// Purpose: Server Actions für TikTok-Publishing aus dem Admin-Panel
// Docs: docs/TIKTOK_SHOP_API_INTEGRATION.md

'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishProductToTikTok } from '@/lib/tiktok/publish'

export async function publishToTikTok(productId: string) {
  await requireAdmin()

  const result = await publishProductToTikTok(productId)
  revalidatePath('/admin/produkte')

  return result.error
    ? { ok: false as const, error: result.error }
    : { ok: true as const, tiktokProductId: result.tiktokProductId }
}

export async function queueForTikTok(productId: string) {
  await requireAdmin()

  const supabase = createAdminClient()
  await supabase
    .from('products')
    .update({ tiktok_status: 'pending', tiktok_last_error: null })
    .eq('id', productId)
    .is('tiktok_product_id', null)

  revalidatePath('/admin/produkte')
  return { ok: true as const }
}
