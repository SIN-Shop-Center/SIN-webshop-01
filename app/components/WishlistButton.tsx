// Purpose: Wishlist toggle button — wired to existing toggleWishlist action
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10 — bug fix: wire the dead WishlistButton)

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleWishlist } from '@/lib/actions/wishlist'
import { HeartIcon, SpinnerIcon } from './icons'

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
    startTransition(async () => {
      const result = await toggleWishlist(productId)
      if (result.requiresLogin) {
        router.push('/auth/login')
        return
      }
      setWishlisted((v) => !v)
      router.refresh()
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
      {wishlisted && (
        <a
          href="/wunschliste"
          className="text-center text-sm text-primary underline hover:text-primary/80"
        >
          Wunschliste ansehen →
        </a>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {error ?? ''}
      </span>
    </div>
  )
}
