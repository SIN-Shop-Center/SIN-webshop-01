// Purpose: Wishlist page (Step 3 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import { getWishlist } from '@/lib/actions/wishlist'
import { getProductById } from '@/lib/queries'
import { ProductCard } from '@/components/ProductCard'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Wunschliste</h1>
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Melde dich an, um deine Wunschliste zu sehen.
          </p>
          <Link href="/auth/login" className="font-medium text-primary underline">
            Anmelden
          </Link>
        </div>
      </div>
    )
  }

  const productIds = await getWishlist()
  const products = (
    await Promise.all(productIds.map((id) => getProductById(id)))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Wunschliste</h1>
      {products.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">Deine Wunschliste ist leer.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
