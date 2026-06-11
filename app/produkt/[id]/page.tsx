// Purpose: Product detail page with metadata, JSON-LD, trust badges (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductById, getAllProductIdsForBuild } from '@/lib/queries'
import { AddToCartButton } from '@/components/AddToCartButton'
import { PriceTag } from '@/components/PriceTag'
import { ProductGallery } from '@/components/ProductGallery'
import { WishlistButton } from '@/components/WishlistButton'
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

  const priceCents = Math.round(Number(product.price) * 100)
  const originalPriceCents =
    product.originalPrice != null
      ? Math.round(Number(product.originalPrice) * 100)
      : null
  const lowStock = product.stock > 0 && product.stock <= 5

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="container mx-auto px-4 py-8 md:py-12">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Zurück zur Übersicht
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery
            title={product.title}
            imageUrl={product.imageUrl}
            imageGallery={product.imageGallery}
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

            <div className="mb-6">
              <PriceTag
                priceCents={priceCents}
                originalPriceCents={originalPriceCents}
                size="lg"
              />
            </div>

            {/* Stock indicator */}
            <div className="mb-6">
              {product.stock <= 0 ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
                  Ausverkauft
                </p>
              ) : lowStock ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent-foreground">
                  <span
                    aria-hidden
                    className="inline-block size-2 rounded-full bg-accent"
                  />
                  Nur noch {product.stock} verfügbar
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-sm font-medium text-success">
                  <CheckIcon className="size-4" aria-hidden />
                  Auf Lager — versandbereit
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="mb-8 flex flex-col gap-3">
              <AddToCartButton
                productId={product.id}
                stock={product.stock}
              />
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
      </div>
    </>
  )
}
