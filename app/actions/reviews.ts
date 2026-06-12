// Purpose: Review server actions — only verified buyers may review
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function canUserReview(productId: string): Promise<{
  isLoggedIn: boolean
  hasPurchased: boolean
  hasReviewed: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isLoggedIn: false, hasPurchased: false, hasReviewed: false }

  const [{ data: purchased }, { data: existing }] = await Promise.all([
    supabase.rpc('has_purchased', { p_product: productId }),
    supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return {
    isLoggedIn: true,
    hasPurchased: purchased === true,
    hasReviewed: Boolean(existing),
  }
}

export async function submitReview({
  productId,
  rating,
  comment,
}: {
  productId: string
  rating: number
  comment: string
}) {
  if (!productId || rating < 1 || rating > 5) {
    return { error: 'Ungültige Eingabe.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Bitte melde dich an, um eine Bewertung zu schreiben.' }
  }

  // Server-side purchase verification
  const { data: purchased } = await supabase.rpc('has_purchased', {
    p_product: productId,
  })
  if (purchased !== true) {
    return {
      error:
        'Nur verifizierte Käufer können dieses Produkt bewerten. Du kannst eine Bewertung abgeben, sobald du es bei uns gekauft hast.',
    }
  }

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Anonym'

  const { error } = await supabase.from('reviews').upsert(
    {
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim().slice(0, 1000) || null,
      user_name: userName,
      source: 'shop',
      is_verified: true,
    },
    { onConflict: 'product_id,user_id' },
  )

  if (error) {
    console.error('[reviews] Fehler beim Speichern:', error.message)
    return { error: 'Bewertung konnte nicht gespeichert werden. Bitte versuche es erneut.' }
  }

  revalidatePath(`/produkt/${productId}`)
  return { ok: true }
}
