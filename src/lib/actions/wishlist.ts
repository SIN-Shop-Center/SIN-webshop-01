// Purpose: Wishlist server actions — RLS-scoped per user (Step 3)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// SECURITY: Uses the regular (anon) server client, NOT the admin client.
// RLS policies on wishlist_items ensure each user only sees their own rows.

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function getWishlist(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => row.product_id)
}

export async function toggleWishlist(productId: string): Promise<{ requiresLogin?: boolean }> {
  if (!UUID_RE.test(productId)) throw new Error('Ungültige Produkt-ID')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { requiresLogin: true }

  const { data: existing } = await supabase
    .from('wishlist_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', existing.id)
      .eq('user_id', user.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('wishlist_items').insert({
      user_id: user.id,
      product_id: productId,
    })
    if (error && error.code !== '23505') throw error
  }

  revalidatePath('/wunschliste')
  return {}
}
