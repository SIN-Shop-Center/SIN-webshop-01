import Image from 'next/image'
import Link from '@/components/ui/Link'
import { HeartIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface WishlistTabProps {
  products: Product[]
}

export function WishlistTab({ products }: WishlistTabProps) {
  if (products.length === 0) {
    return (
      <section className="panel p-12 text-center">
        <HeartIcon className="mx-auto h-14 w-14 text-brand-text-muted" />
        <h2 className="mt-4 text-2xl">Wunschliste ist leer</h2>
        <p className="mt-2 text-brand-text-muted">Füge Produkte hinzu, um sie später schneller wiederzufinden.</p>
        <Link href="/products" className="mt-5 inline-flex">
          <Button>Produkte entdecken</Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Meine Wunschliste</h2>
        <span className="text-sm text-brand-text-muted">{products.length} Artikel</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.id} className="panel flex gap-4 p-4">
            <div className="h-24 w-24 overflow-hidden rounded-lg bg-brand-bg-muted">
              <Image
                src={product.images[0] || '/catalog/product-fallback.svg'}
                alt={product.name}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-brand-text">{product.name}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-semibold text-brand-accent">{formatPrice(product.price)}</span>
                {product.originalPrice ? (
                  <span className="text-sm text-brand-text-muted line-through">{formatPrice(product.originalPrice)}</span>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm">In den Warenkorb</Button>
                <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
