// Purpose: Product detail page with gallery, variants, related products
// Docs: AGENTS.md

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById, getAllProductIdsForBuild } from '@/lib/queries'
import { PriceTag } from '@/components/PriceTag'
import { AddToCartButton } from '@/components/AddToCartButton'
import { toCents } from '@/lib/format'
import { ImageGallery } from '@/components/image-gallery'
import { VariantSelector } from '@/components/variant-selector'
import { RelatedProducts } from '@/components/related-products'
import { WishlistButton } from '@/components/WishlistButton'
import { ProductTabs } from '@/components/product-tabs'
import { ProductJsonLd } from '@/components/ProductJsonLd'
import {
  TruckIcon,
  ShieldCheckIcon,
  RotateCcwIcon,
  CheckIcon,
  ArrowLeftIcon,
} from '@/components/icons'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  try {
    const ids = await getAllProductIdsForBuild()
    return ids.map((id) => ({ id }))
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  try {
    const product = await getProductById(id)
    if (!product) return { title: 'Produkt nicht gefunden' }
    const description = product.description.slice(0, 160)
    return {
      title: product.title,
      description,
      openGraph: {
        title: product.title,
        description,
        type: 'website',
        images: product.imageUrl
          ? [{ url: product.imageUrl, alt: product.title }]
          : undefined,
        url: `${APP_URL}/produkt/${product.id}`,
      },
      alternates: {
        canonical: `${APP_URL}/produkt/${product.id}`,
      },
    }
  } catch {
    return { title: 'Produkt' }
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await getProductById(id)

  if (!product) notFound()

  const priceCents = toCents(product.price)
  const originalPriceCents =
    product.originalPrice != null
      ? toCents(product.originalPrice)
      : null

  const galleryImages = product.imageGallery?.length
    ? product.imageGallery
    : product.imageUrl
      ? [product.imageUrl]
      : []

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="container mx-auto px-4 py-8 pb-28 md:py-12 lg:pb-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Start</Link>
          {' / '}
          <Link href="/produkte" className="hover:text-foreground">Produkte</Link>
          {' / '}
          <span className="text-foreground">{product.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ImageGallery
            images={galleryImages}
            alt={product.title}
          />

          <div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
              {product.title}
            </h1>
            {product.rating > 0 && (
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({product.ratingCount} Bewertungen)
                </span>
              </div>
            )}
            <p className="mb-6 text-pretty text-muted-foreground">
              {product.description}
            </p>

            {/* Variants + Price + Add to Cart */}
            <div className="mb-8">
              <VariantSelector product={product} />
            </div>

            {/* Product Tabs */}
            <ProductTabs description={product.description} />

            {/* Wishlist */}
            <div className="mb-6">
              <WishlistButton productId={product.id} />
            </div>

            {/* Trust badges */}
            <ul className="mb-8 grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <TruckIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>Kostenloser Versand ab 49 €</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>Sichere Stripe-Zahlung</span>
              </li>
              <li className="flex items-center gap-2">
                <RotateCcwIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>14 Tage Widerrufsrecht</span>
              </li>
            </ul>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 text-base font-semibold">Highlights</h2>
                <ul className="space-y-1.5 text-sm text-pretty">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckIcon
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {product.specifications &&
              Object.keys(product.specifications).length > 0 && (
                <div>
                  <h2 className="mb-3 text-base font-semibold">Spezifikationen</h2>
                  <dl className="overflow-hidden rounded-lg border border-border text-sm">
                    {Object.entries(product.specifications).map(
                      ([key, value], i) => (
                        <div
                          key={key}
                          className={
                            i % 2 === 0
                              ? 'flex bg-muted/30 px-3 py-2'
                              : 'flex px-3 py-2'
                          }
                        >
                          <dt className="w-1/2 font-medium text-muted-foreground">
                            {key}
                          </dt>
                          <dd className="w-1/2 text-pretty">{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              )}
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts productId={product.id} categoryId={null} />

        {product.stock > 0 && (
          <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
            <div className="container mx-auto flex items-center gap-4 px-4 py-3">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs text-muted-foreground">
                  {product.title}
                </span>
                <PriceTag
                  priceCents={priceCents}
                  originalPriceCents={originalPriceCents}
                />
              </div>
              <div className="flex-1">
                <AddToCartButton productId={product.id} stock={product.stock} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
