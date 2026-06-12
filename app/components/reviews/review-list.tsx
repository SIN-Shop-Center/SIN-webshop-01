// Purpose: Display customer reviews with star ratings
// Docs: AGENTS.md

import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  user_name: string | null
}

function StarRow({ rating, size = 'size-4' }: { rating: number; size?: string }) {
  return (
    <div className="flex" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(rating) ? 'fill-rating text-rating' : 'text-border'}`} />
      ))}
    </div>
  )
}

export async function ReviewList({ productId }: { productId: string }) {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, user_name')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20)

  const list = (reviews ?? []) as Review[]
  const avg = list.length > 0 ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0

  return (
    <section aria-labelledby="reviews-heading" className="mt-12">
      <h2 id="reviews-heading" className="mb-4 text-xl font-bold">
        Kundenbewertungen
      </h2>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Bewertungen. Sei der Erste und teile deine Erfahrung!
        </p>
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
            <div className="flex flex-col gap-0.5">
              <StarRow rating={avg} size="size-5" />
              <span className="text-xs text-muted-foreground">
                Basierend auf {list.length} {list.length === 1 ? 'Bewertung' : 'Bewertungen'}
              </span>
            </div>
          </div>

          <ul className="flex flex-col gap-4">
            {list.map((review) => (
              <li key={review.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRow rating={review.rating} size="size-3.5" />
                    <span className="text-sm font-medium">{review.user_name ?? 'Anonym'}</span>
                  </div>
                  <time dateTime={review.created_at} className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString('de-DE')}
                  </time>
                </div>
                {review.comment && (
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">{review.comment}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
