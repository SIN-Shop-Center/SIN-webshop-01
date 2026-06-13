// Purpose: Account-scoped wishlist page with remove + bulk cart actions
// Docs: AGENTS.md

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWishlist } from '@/lib/actions/wishlist'
import { getProductsByIds } from '@/lib/queries'
import { WishlistGrid } from './wishlist-grid'
import { HeartIcon, ArrowRightIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function WunschlistePage() {
  const productIds = await getWishlist()

  if (productIds.length === 0) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">
          Wunschliste
        </h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <HeartIcon
            className="mb-4 size-12 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mb-2 text-lg font-semibold">
            Deine Wunschliste ist leer
          </h2>
          <p className="mb-6 max-w-sm text-pretty text-sm text-muted-foreground">
            Tippe auf das Herz-Icon bei einem Produkt, um es hier zu speichern.
          </p>
          <Link href="/" className="btn btn-primary btn-md">
            Produkte entdecken
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  const products = await getProductsByIds(productIds)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">
        Wunschliste
      </h1>
      <WishlistGrid products={products} />
    </div>
  )
}
