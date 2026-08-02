// Purpose: Featured toggle (client component, Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useTransition } from 'react'
import { toggleFeatured } from '@/lib/actions/admin'

export function FeaturedToggle({
  productId,
  isFeatured,
}: {
  productId: string
  isFeatured: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isFeatured}
      aria-label="Featured umschalten"
      disabled={isPending}
      onClick={() => startTransition(() => toggleFeatured(productId))}
      className={
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ' +
        (isFeatured ? 'bg-primary' : 'bg-muted-foreground/30')
      }
    >
      <span
        aria-hidden
        className={
          'inline-block size-5 transform rounded-full bg-background shadow-sm transition-transform ' +
          (isFeatured ? 'translate-x-5' : 'translate-x-0.5')
        }
      />
    </button>
  )
}
