// Purpose: Product JSON-LD for Google Rich Results (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Product } from '@/lib/data'
import { SHIPPING } from '@/lib/shipping-constants'

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

  const offers: Record<string, any> = {
    '@type': 'Offer',
    url,
    priceCurrency: 'EUR',
    price: (Number(product.price) || 0).toFixed(2),
    availability,
    itemCondition: 'https://schema.org/NewCondition',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: 'DE',
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: SHIPPING.deliveryDaysMin,
        maxValue: SHIPPING.deliveryDaysMax,
        unitCode: 'DAY',
      },
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'DE' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: SHIPPING.deliveryDaysMin,
          maxValue: SHIPPING.deliveryDaysMax,
          unitCode: 'DAY',
        },
      },
      shippingRate: {
        '@type': 'MonetaryAmount',
        currency: 'EUR',
        value:
          Math.round(Number(product.price) * 100) >= SHIPPING.freeAboveCents
            ? '0.00'
            : (SHIPPING.standardCents / 100).toFixed(2),
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
    offers,
  }

  if (product.manufacturer) {
    data.manufacturer = {
      '@type': 'Organization',
      name: product.manufacturer.name,
    }
  }

  if (product.category) {
    data.category = product.category
  }

  if (product.rating > 0 && product.ratingCount > 0) {
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
