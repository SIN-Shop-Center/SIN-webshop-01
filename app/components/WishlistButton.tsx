// Purpose: Wishlist toggle button — optimistic UI, real error handling
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10 — bug fix: wire the dead WishlistButton)

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toggleWishlist } from '@/lib/actions/wishlist'
import { HeartIcon, SpinnerIcon, AlertCircleIcon } from './icons'

export function WishlistButton({
  productId,
  initiallyWishlisted = false,
}: {
  productId: string
  initiallyWishlisted?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleClick() {
    setError(null)
    const previous = wishlisted
    setWishlisted(!previous)
    startTransition(async () => {
      try {
        const result = await toggleWishlist(productId)
        if (result.requiresLogin) {
          setWishlisted(previous)
          router.push('/auth/login')
          return
        }
        router.refresh()
      } catch {
        setWishlisted(previous)
        setError('Wunschliste konnte nicht aktualisiert werden. Bitte versuche es erneut.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="btn btn-outline btn-lg w-full"
        aria-pressed={wishlisted}
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-5 animate-spin" aria-hidden />
            Wird aktualisiert…
          </>
        ) : wishlisted ? (
          <>
            <HeartIcon className="size-5 fill-current" aria-hidden />
            Auf der Wunschliste
          </>
        ) : (
          <>
            <HeartIcon className="size-5" aria-hidden />
            Auf die Wunschliste
          </>
        )}
      </button>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {wishlisted && !error && (
        <Link
          href="/wunschliste"
          className="text-center text-sm text-primary underline hover:text-primary/80"
        >
          Wunschliste ansehen →
        </Link>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {error ?? (wishlisted ? 'Zur Wunschliste hinzugefügt' : '')}
      </span>
    </div>
  )
}
