// Purpose: Wishlist page with auth-gated empty state (Step 3 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { getWishlist } from '@/lib/actions/wishlist'
import { getProductById } from '@/lib/queries'
import { ProductCard } from '@/components/ProductCard'
import { createClient } from '@/lib/supabase/server'
import { HeartIcon, ArrowRightIcon } from '@/components/icons'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">Wunschliste</h1>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
          <HeartIcon
            className="mb-4 size-12 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mb-2 text-lg font-semibold">
            Melde dich an, um deine Wunschliste zu sehen
          </h2>
          <p className="mb-6 max-w-sm text-pretty text-sm text-muted-foreground">
            Speichere deine Lieblingsprodukte und greife jederzeit von jedem
            Gerät darauf zu.
          </p>
          <Link href="/auth/login" className="btn btn-primary btn-md">
            Anmelden
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    )
  }

  const productIds = await getWishlist()
  const products = (
    await Promise.all(productIds.map((id) => getProductById(id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">Wunschliste</h1>
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

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Wunschliste</h1>
      <p className="mb-8 text-muted-foreground">
        {products.length} gespeicherte {products.length === 1 ? 'Produkt' : 'Produkte'}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  )
}
