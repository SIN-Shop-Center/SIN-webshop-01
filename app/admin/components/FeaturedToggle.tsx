// Purpose: Featured toggle (client component, Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

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
      role="switch"
      aria-checked={isFeatured}
      aria-label="Featured umschalten"
      disabled={isPending}
      onClick={() => startTransition(() => toggleFeatured(productId))}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
        isFeatured ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-background transition-transform ${
          isFeatured ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
