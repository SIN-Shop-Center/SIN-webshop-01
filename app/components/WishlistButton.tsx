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
  variant = 'default',
}: {
  productId: string
  initiallyWishlisted?: boolean
  variant?: 'default' | 'icon'
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

  const heartIcon = isPending ? (
    <SpinnerIcon className="size-5 animate-spin" aria-hidden />
  ) : wishlisted ? (
    <HeartIcon className="size-5 fill-current" aria-hidden />
  ) : (
    <HeartIcon className="size-5" aria-hidden />
  )

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? 'Von Wunschliste entfernen' : 'Auf die Wunschliste'}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {heartIcon}
        </button>
        {error && (
          <p className="sr-only" role="alert">
            {error}
          </p>
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {error ?? (wishlisted ? 'Zur Wunschliste hinzugefügt' : '')}
        </span>
      </>
    )
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
