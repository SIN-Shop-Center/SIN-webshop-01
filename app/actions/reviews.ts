// Purpose: Server action for review submission
// Docs: AGENTS.md

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

  const userName = (user.user_metadata?.name as string | undefined) ?? user.email?.split('@')[0] ?? 'Anonym'

  const { error } = await supabase.from('reviews').upsert(
    {
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim().slice(0, 1000) || null,
      user_name: userName,
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
