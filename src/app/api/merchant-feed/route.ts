// Purpose: Conservative Google Merchant RSS feed for sellable DE inventory.

import { createAdminClient } from '@/lib/supabase/admin'
import { SHIPPING } from '@/lib/shipping-constants'

export const revalidate = 3600

function xml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function siteUrl(): string {
  const url = new URL(String(process.env.NEXT_PUBLIC_APP_URL || '').trim())
  if (url.protocol !== 'https:') throw new Error('Merchant feed requires HTTPS app URL')
  url.pathname = ''
  url.search = ''
  url.hash = ''
  return url.toString().replace(/\/$/, '')
}

function money(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

type FeedProduct = {
  id: string
  title: string | null
  description: string | null
  price: number | string
  original_price: number | string | null
  compare_at_price: number | string | null
  stock: number
  image_url: string | null
  image_gallery: string[] | null
  category_id: string | null
  metadata: Record<string, unknown> | null
  manufacturer_verified: boolean
  responsible_person_verified: boolean
}

export async function GET() {
  let baseUrl: string
  try {
    baseUrl = siteUrl()
  } catch (error) {
    console.error('[merchant-feed] invalid site URL:', error)
    return new Response('feed unavailable', { status: 503 })
  }

  const admin = createAdminClient()
  const [productsResult, categoriesResult] = await Promise.all([
    admin
      .from('products_v')
      .select(
        'id, title, description, price, original_price, compare_at_price, stock, image_url, image_gallery, category_id, metadata, manufacturer_verified, responsible_person_verified',
      )
      .eq('is_active', true)
      .gt('stock', 0)
      .gt('price', 0)
      .limit(5000),
    admin.from('categories').select('id, name').eq('is_active', true).limit(1000),
  ])

  if (productsResult.error) {
    console.error('[merchant-feed] product query failed:', productsResult.error.message)
    return new Response('feed unavailable', { status: 503 })
  }
  if (categoriesResult.error) {
    console.error('[merchant-feed] category query failed:', categoriesResult.error.message)
  }

  const categoryMap = new Map(
    (categoriesResult.data ?? []).map((category) => [String(category.id), String(category.name)]),
  )

  const items = (productsResult.data ?? [])
    .map((raw) => raw as FeedProduct)
    .filter((product) => {
      const image = product.image_gallery?.[0] ?? product.image_url
      return Boolean(
        product.id &&
          product.title?.trim() &&
          image?.trim() &&
          product.manufacturer_verified &&
          product.responsible_person_verified,
      )
    })
    .map((product) => {
      const currentPrice = money(product.price)!
      const comparePrice = money(product.compare_at_price ?? product.original_price)
      const regularPrice = comparePrice && comparePrice > currentPrice ? comparePrice : currentPrice
      const image = product.image_gallery?.[0] ?? product.image_url ?? ''
      const metadata = product.metadata ?? {}
      const brand = typeof metadata.brand === 'string' ? metadata.brand.trim().slice(0, 70) : ''
      const gtin = typeof metadata.gtin === 'string' ? metadata.gtin.trim() : ''
      const mpn = typeof metadata.mpn === 'string' ? metadata.mpn.trim() : ''
      const category = product.category_id ? categoryMap.get(product.category_id) : undefined
      const shippingCents = currentPrice * 100 >= SHIPPING.freeAboveCents
        ? 0
        : SHIPPING.standardCents

      const lines = [
        '  <item>',
        `    <g:id>${xml(product.id)}</g:id>`,
        `    <g:title>${xml(product.title!.slice(0, 150))}</g:title>`,
        `    <g:description>${xml((product.description || product.title || '').slice(0, 5000))}</g:description>`,
        `    <g:link>${xml(`${baseUrl}/produkt/${product.id}`)}</g:link>`,
        `    <g:image_link>${xml(image)}</g:image_link>`,
        '    <g:availability>in_stock</g:availability>',
        `    <g:price>${regularPrice.toFixed(2)} EUR</g:price>`,
      ]

      if (regularPrice > currentPrice) {
        lines.push(`    <g:sale_price>${currentPrice.toFixed(2)} EUR</g:sale_price>`)
      }

      lines.push('    <g:condition>new</g:condition>')
      if (brand) lines.push(`    <g:brand>${xml(brand)}</g:brand>`)
      if (gtin) lines.push(`    <g:gtin>${xml(gtin)}</g:gtin>`)
      if (mpn) lines.push(`    <g:mpn>${xml(mpn)}</g:mpn>`)
      lines.push(`    <g:identifier_exists>${gtin || mpn ? 'yes' : 'no'}</g:identifier_exists>`)
      if (category) lines.push(`    <g:product_type>${xml(category)}</g:product_type>`)

      lines.push(
        '    <g:shipping>',
        '      <g:country>DE</g:country>',
        '      <g:service>Standard</g:service>',
        `      <g:price>${(shippingCents / 100).toFixed(2)} EUR</g:price>`,
        `      <g:min_transit_time>${SHIPPING.deliveryDaysMin}</g:min_transit_time>`,
        `      <g:max_transit_time>${SHIPPING.deliveryDaysMax}</g:max_transit_time>`,
        '    </g:shipping>',
        '  </item>',
      )
      return lines.join('\n')
    })
    .join('\n')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ShopSIN Produktfeed</title>
  <link>${xml(baseUrl)}</link>
  <description>Aktive und lieferbare ShopSIN-Produkte</description>
${items}
</channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
