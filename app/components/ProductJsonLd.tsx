// Purpose: Product JSON-LD for Google Rich Results (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Product } from '@/lib/data'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

export function ProductJsonLd({ product }: { product: Product }) {
  const url = `${APP_URL}/produkt/${product.id}`
  const imageUrl = product.imageUrl?.startsWith('http')
    ? product.imageUrl
    : `${APP_URL}${product.imageUrl}`

  const images = product.imageGallery?.length
    ? product.imageGallery.map((img) =>
        img.startsWith('http') ? img : `${APP_URL}${img}`,
      )
    : imageUrl
      ? [imageUrl]
      : undefined

  const availability =
    product.stock > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock'

  const priceValidUntil = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const offers: Record<string, any> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'EUR',
    price: (Number(product.price) || 0).toFixed(2),
    availability,
    priceValidUntil,
    itemCondition: 'https://schema.org/NewCondition',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'DE',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 7, maxValue: 15, unitCode: 'DAY' },
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 7, maxValue: 15, unitCode: 'DAY' },
      },
      shippingRate: {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value: Number(product.price) >= 49 ? '0.00' : '6.99',
      },
    },
    seller: {
      '@type': 'Organization',
      name: 'ShopSIN',
    },
  }

  if (product.originalPrice && product.originalPrice > product.price) {
    offers.highPrice = product.originalPrice.toFixed(2)
  }

  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: images,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'ShopSIN',
    },
    offers,
  }

  if (product.category) {
    data.category = product.category
  }

  if (product.rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.ratingCount,
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
