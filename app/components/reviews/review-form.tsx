// Purpose: Client-side review submission form with star rating
// Docs: AGENTS.md

'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { submitReview } from '@/app/actions/reviews'

export function ReviewForm({ productId, isLoggedIn }: { productId: string; isLoggedIn: boolean }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isLoggedIn) {
    return (
      <p className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
        <a href="/auth/login" className="font-medium text-foreground underline underline-offset-4">
          Melde dich an
        </a>
        , um eine Bewertung zu schreiben.
      </p>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setMessage({ type: 'error', text: 'Bitte wähle eine Sternebewertung aus.' })
      return
    }
    setMessage(null)
    startTransition(async () => {
      const result = await submitReview({ productId, rating, comment })
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'ok', text: 'Danke für deine Bewertung!' })
        setComment('')
        setRating(0)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Deine Bewertung</h3>

      <div className="flex gap-1" role="radiogroup" aria-label="Sternebewertung">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={rating === i}
            aria-label={`${i} ${i === 1 ? 'Stern' : 'Sterne'}`}
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
          >
            <Star
              className={`size-6 transition-colors ${
                i <= (hover || rating) ? 'fill-rating text-rating' : 'text-border'
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Wie zufrieden bist du mit dem Produkt? (optional)"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-primary'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Wird gesendet…' : 'Bewertung abschicken'}
      </button>
    </form>
  )
}
