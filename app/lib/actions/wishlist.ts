// Purpose: Wishlist server actions — RLS-scoped per user (Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// SECURITY: Uses the regular (anon) server client, NOT the admin client.
// RLS policies on wishlist_items ensure each user only sees their own rows.

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getWishlist(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')

  if (error) throw error
  return (data ?? []).map((row) => row.product_id)
}

export async function toggleWishlist(productId: string): Promise<{ requiresLogin?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requiresLogin: true }

  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase.from('wishlist_items').delete().eq('id', existing.id)
  } else {
    await supabase.from('wishlist_items').insert({
      user_id: user.id,
      product_id: productId,
    })
  }

  revalidatePath('/wunschliste')
  return {}
}
