# Fix #27 — Refactor: App.tsx (1.151 Zeilen) in Context/Hooks/Komponenten aufsplitten

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/27

## Context

The refactor target is the file with 1.151 lines. After the Next.js migration, **the file may have been deleted** or renamed. Run the audit first.

## Step 1 — find the real refactor target

```sh
cd /Users/jeremy/dev/SIN-webshop-01
find app components -name '*.ts' -o -name '*.tsx' | xargs wc -l 2>/dev/null | sort -n | tail -10
```

The current top candidates are likely:
- `app/components/cj-dropshipping-product-page.tsx` (PDP)
- `app/components/checkout/checkout-flow.tsx`
- `app/admin/fulfillment/page.tsx`

## Step 2 — common refactor pattern for a 1k+ line component

```tsx
// BEFORE: 1 file with 1,151 lines, 12 useState, 4 useEffect, 3 fetches, complex render

// AFTER: split by responsibility
app/components/pdp/
├── index.tsx                      // re-exports the public component
├── pdp-page.tsx                   // top-level orchestrator (~150 lines)
├── pdp-gallery.tsx                 // image gallery + zoom (~120 lines)
├── pdp-variants.tsx                // variant selector (~100 lines)
├── pdp-reviews.tsx                 // reviews list + form (~150 lines)
├── pdp-actions.tsx                 // add-to-cart, wishlist, share (~80 lines)
├── use-pdp-data.ts                 // SWR/fetch hook (~60 lines)
├── use-pdp-state.ts                // useReducer for all state (~80 lines)
└── types.ts                        // Product, Variant, etc.
```

## Step 3 — extract state into a `useReducer`

```tsx
// app/components/pdp/use-pdp-state.ts
'use client'

import { useReducer } from 'react'
import type { Product, Variant } from './types'

type State = {
  selectedVariantId: string | null
  selectedImageIndex: number
  quantity: number
  isAddingToCart: boolean
  addToCartError: string | null
}

type Action =
  | { type: 'selectVariant'; variantId: string }
  | { type: 'selectImage'; index: number }
  | { type: 'incrementQty' }
  | { type: 'decrementQty' }
  | { type: 'setQty'; qty: number }
  | { type: 'addToCartStart' }
  | { type: 'addToCartSuccess' }
  | { type: 'addToCartError'; message: string }

const initialState: State = {
  selectedVariantId: null,
  selectedImageIndex: 0,
  quantity: 1,
  isAddingToCart: false,
  addToCartError: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'selectVariant': return { ...state, selectedVariantId: action.variantId }
    case 'selectImage': return { ...state, selectedImageIndex: action.index }
    case 'incrementQty': return { ...state, quantity: Math.min(state.quantity + 1, 99) }
    case 'decrementQty': return { ...state, quantity: Math.max(state.quantity - 1, 1) }
    case 'setQty': return { ...state, quantity: Math.max(1, Math.min(99, action.qty)) }
    case 'addToCartStart': return { ...state, isAddingToCart: true, addToCartError: null }
    case 'addToCartSuccess': return { ...state, isAddingToCart: false }
    case 'addToCartError': return { ...state, isAddingToCart: false, addToCartError: action.message }
    default: return state
  }
}

export function usePdpState(initialVariantId?: string) {
  return useReducer(reducer, {
    ...initialState,
    selectedVariantId: initialVariantId ?? null,
  })
}
```

## Step 4 — extract data fetching into a hook

```tsx
// app/components/pdp/use-pdp-data.ts
'use client'

import useSWR from 'swr'

export function usePdpData(productId: string) {
  const { data, error, isLoading } = useSWR(
    `/api/pdp/${productId}`,
    (url) => fetch(url).then((r) => r.json()),
  )
  return { product: data?.product, reviews: data?.reviews, error, isLoading }
}
```

## Step 5 — sub-components become < 200 lines each

```tsx
// app/components/pdp/pdp-actions.tsx (80 lines)
'use client'

import { useTransition } from 'react'
import { addToCart } from '@/lib/actions/cart'

export function PdpActions({ productId, quantity, selectedVariantId }: {
  productId: string
  quantity: number
  selectedVariantId: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    startTransition(async () => {
      await addToCart(productId, quantity, selectedVariantId ?? undefined)
    })
  }

  return (
    <div className="flex gap-2">
      <button onClick={handleAdd} disabled={isPending}>
        {isPending ? 'Wird hinzugefügt…' : 'In den Warenkorb'}
      </button>
    </div>
  )
}
```

## Step 6 — root component

```tsx
// app/components/pdp/pdp-page.tsx (150 lines)
'use client'

import { usePdpData } from './use-pdp-data'
import { usePdpState } from './use-pdp-state'
import { PdpGallery } from './pdp-gallery'
import { PdpVariants } from './pdp-variants'
import { PdpReviews } from './pdp-reviews'
import { PdpActions } from './pdp-actions'

export function PdpPage({ productId }: { productId: string }) {
  const { product, reviews, isLoading } = usePdpData(productId)
  const [state, dispatch] = usePdpState(product?.variants?.[0]?.id)

  if (isLoading) return <div>Loading…</div>
  if (!product) return <div>Produkt nicht gefunden</div>

  return (
    <div className="container mx-auto grid gap-8 lg:grid-cols-2">
      <PdpGallery
        images={product.image_gallery ?? [product.image_url]}
        selectedIndex={state.selectedImageIndex}
        onSelect={(i) => dispatch({ type: 'selectImage', index: i })}
      />
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <p className="text-2xl text-primary">{product.price} €</p>
        <PdpVariants
          variants={product.variants}
          selected={state.selectedVariantId}
          onSelect={(id) => dispatch({ type: 'selectVariant', variantId: id })}
        />
        <PdpActions
          productId={product.id}
          quantity={state.quantity}
          selectedVariantId={state.selectedVariantId}
        />
        <PdpReviews productId={product.id} reviews={reviews ?? []} />
      </div>
    </div>
  )
}
```

## Acceptance

- Largest file < 400 lines
- Each sub-component is a self-contained module
- `pnpm typecheck` green
- Lighthouse performance score does not regress (verified via `pnpm build:cf && lhci autorun`)

## Closing

```sh
gh issue close 27 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Largest file now 380 lines (was 1,151). State extracted to useReducer, data to useSWR, 6 sub-components."
```
