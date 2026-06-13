// Purpose: Product detail page with gallery, variants, related products
// Docs: AGENTS.md

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductById, getAllProductIdsForBuild } from '@/lib/queries'
import { getProductBadges } from '@/lib/product-badges'
import { canUserReview } from '@/app/actions/reviews'
import { toCents } from '@/lib/format'
import { ImageGallery } from '@/components/image-gallery'
import { VariantSelector } from '@/components/variant-selector'
import { RelatedProducts } from '@/components/related-products'
import { WishlistButton } from '@/components/WishlistButton'
import { StockIndicator } from '@/components/conversion/stock-indicator'
import { LiveViewers } from '@/components/conversion/live-viewers'
import { FreeShippingNudge } from '@/components/conversion/free-shipping-nudge'
import { BoughtTogether } from '@/components/conversion/bought-together'
import { ReviewList } from '@/components/reviews/review-list'
import { ReviewForm } from '@/components/reviews/review-form'
import { RecentlyViewed } from '@/components/product/recently-viewed'
import { TrackView } from '@/components/product/track-view'
import { DeliveryEstimate } from '@/components/product/delivery-estimate'
import { RatingSummary } from '@/components/product/rating-summary'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { ProductJsonLd } from '@/components/ProductJsonLd'
import { TrustBadges } from '@/components/product/trust-badges'
import { SizeGuide } from '@/components/product/size-guide'
import { AccordionInfo } from '@/components/product/accordion-info'
import { StickyAddToCart } from '@/components/product/sticky-add-to-cart'
import { PriceTag } from '@/components/PriceTag'
import {
  CheckIcon,
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
    const productUrl = `${APP_URL}/produkt/${product.id}`
    const ogImage = product.imageUrl
      ? { url: product.imageUrl, width: 1200, height: 630, alt: product.title }
      : undefined
    return {
      title: product.title,
      description,
      openGraph: {
        title: product.title,
        description,
        type: 'website',
        images: ogImage ? [ogImage] : undefined,
        url: productUrl,
        siteName: 'ShopSIN',
        locale: 'de_DE',
      },
      twitter: {
        card: 'summary_large_image',
        title: product.title,
        description,
        images: product.imageUrl ? [product.imageUrl] : undefined,
      },
      alternates: {
        canonical: productUrl,
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

  const reviewStatus = await canUserReview(product.id)

  const priceCents = toCents(product.price)
  const originalPriceCents =
    product.originalPrice != null
      ? toCents(product.originalPrice)
      : null

  const galleryImages = Array.isArray(product.imageGallery)
    ? product.imageGallery.flat(2).filter((img): img is string => typeof img === 'string' && Boolean(img))
    : product.imageUrl
      ? [product.imageUrl]
      : []

  const badges = getProductBadges({
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    stock: product.stock,
    rating: product.rating,
    ratingCount: product.ratingCount,
    soldCount: product.soldCount,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt ?? null,
  })

  return (
    <>
      <ProductJsonLd product={product} />
      <div className="container mx-auto px-4 py-8 pb-28 md:py-12 lg:pb-12">
        <Breadcrumbs
          items={[
            { label: 'Produkte', href: '/produkte' },
            { label: product.title },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ImageGallery
            images={galleryImages}
            alt={product.title}
            badges={badges}
          />

          <div className="flex flex-col">
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-balance md:text-4xl lg:text-5xl">
              {product.title}
            </h1>
            <RatingSummary
              rating={product.rating}
              ratingCount={product.ratingCount}
              soldCount={product.soldCount}
            />

            {/* Price - prominent */}
            <div className="my-4 pb-4 border-b border-border">
              <PriceTag
                priceCents={priceCents}
                originalPriceCents={originalPriceCents}
                size="lg"
              />
            </div>

            <p className="mb-6 text-base leading-relaxed text-muted-foreground text-pretty">
              {product.description}
            </p>

            {/* Variants + Add to Cart */}
            <div className="mb-6">
              <VariantSelector product={product} />
            </div>

            {/* Size Guide */}
            <div className="mb-6">
              <SizeGuide />
            </div>

            {product.stock > 0 && <StockIndicator stock={product.stock} />}
            <LiveViewers productId={product.id} />
            <FreeShippingNudge />

            {/* Trust badges */}
            <div className="my-6 py-4 border-y border-border">
              <TrustBadges />
            </div>

            {/* Wishlist */}
            <div className="mb-6">
              <WishlistButton productId={product.id} />
            </div>

            <div className="mb-8">
              <DeliveryEstimate />
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold">Highlights</h2>
                <ul className="space-y-2 text-sm text-pretty">
                  {product.features.map((feature, i) => (
                    <li key={i} className="flex gap-3">
                      <CheckIcon
                        className="mt-0.5 size-5 shrink-0 text-success"
                        aria-hidden
                      />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {product.specifications &&
              Object.keys(product.specifications).length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-4 text-lg font-bold">Spezifikationen</h2>
                  <dl className="overflow-hidden rounded-xl border border-border text-sm">
                    {Object.entries(product.specifications).map(
                      ([key, value], i) => (
                        <div
                          key={key}
                          className={
                            i % 2 === 0
                              ? 'flex bg-muted/50 px-4 py-3'
                              : 'flex px-4 py-3'
                          }
                        >
                          <dt className="w-1/2 font-semibold text-muted-foreground">
                            {key}
                          </dt>
                          <dd className="w-1/2 text-pretty text-foreground">{value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              )}

            {/* Product accordion */}
            <AccordionInfo description={product.description} />
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts productId={product.id} categoryId={product.categoryId ?? null} />

        {/* Bundle upsell */}
        <BoughtTogether
          mainProduct={{ id: product.id, name: product.title, price: product.price, image: product.imageUrl }}
          suggestions={[]}
        />

        {/* Customer Reviews */}
        <ReviewList productId={product.id} />
        <ReviewForm
          productId={product.id}
          isLoggedIn={reviewStatus.isLoggedIn}
          hasPurchased={reviewStatus.hasPurchased}
          hasReviewed={reviewStatus.hasReviewed}
        />

        {/* Recently Viewed */}
        <RecentlyViewed excludeId={product.id} />
        <TrackView productId={product.id} />

        {product.stock > 0 && (
          <StickyAddToCart
            productId={product.id}
            title={product.title}
            priceCents={priceCents}
            originalPriceCents={originalPriceCents}
            stock={product.stock}
          />
        )}
      </div>
    </>
  )
}
