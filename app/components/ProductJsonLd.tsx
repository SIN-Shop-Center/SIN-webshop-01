// Purpose: Product JSON-LD for Google Rich Results (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Product } from '@/lib/data'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function ProductJsonLd({ product }: { product: Product }) {
  const url = `${APP_URL}/produkt/${product.id}`
  const imageUrl = product.imageUrl?.startsWith('http')
    ? product.imageUrl
    : `${APP_URL}${product.imageUrl}`

  const availability =
    product.stock > 0
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock'

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: imageUrl,
    sku: product.id,
    category: product.category || undefined,
    brand: {
      '@type': 'Brand',
      name: 'ShopSIN',
    },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'EUR',
      price: (Number(product.price) || 0).toFixed(2),
      availability,
      seller: {
        '@type': 'Organization',
        name: 'ShopSIN',
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
