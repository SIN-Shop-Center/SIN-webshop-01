// Purpose: Google Merchant Center Produktfeed (RSS 2.0 / g:-Namespace) (Issue #57)
// Docs: https://support.google.com/merchants/answer/7052112

import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

const SHIPPING_MIN_DAYS = 7
const SHIPPING_MAX_DAYS = 15
const SHIPPING_MAX_EUR = 6.99

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface FeedProduct {
  id: string
  slug: string | null
  title: string | null
  description: string | null
  price: number | string
  original_price: number | string | null
  stock: number
  image_url: string | null
  image_gallery: string[] | null
  is_active: boolean
  category_id: string | null
  allow_backorder: boolean | null
  metadata: Record<string, any> | null
  cj_sku: string | null
}

interface CategoryRow {
  id: string
  name: string
  slug: string
}

export async function GET() {
  const supabase = createAdminClient()

  const [prodResult, catResult] = await Promise.all([
    supabase
      .from('products_v')
      .select('id, slug, title, description, price, original_price, stock, image_url, image_gallery, is_active, category_id, metadata, cj_sku')
      .eq('is_active', true)
      .gt('price', 0),
    supabase
      .from('categories')
      .select('id, name, slug'),
  ])

  if (prodResult.error) {
    return new Response('feed unavailable', { status: 500 })
  }

  const categoryMap = new Map<string, string>()
  for (const c of (catResult.data ?? []) as CategoryRow[]) {
    categoryMap.set(c.id, c.name)
  }

  const items = (prodResult.data ?? [])
    .map((raw) => {
      const p = raw as FeedProduct
      const link = `${SITE_URL}/produkt/${p.slug ?? p.id}`
      const image = p.image_gallery?.[0] ?? p.image_url ?? ''
      const metadata = p.metadata ?? {}

      let availability: string
      if (p.stock > 0) {
        availability = 'in_stock'
      } else if (p.allow_backorder) {
        availability = 'preorder'
      } else {
        availability = 'out_of_stock'
      }

      const brand = esc(metadata.brand ?? 'ShopSIN')
      const gtin = metadata.gtin as string | undefined
      const mpn = metadata.mpn as string | undefined
      const hasGtinMpn = !!(gtin || mpn)

      const category = p.category_id ? (categoryMap.get(p.category_id) ?? '') : ''

      const price = Number(p.price).toFixed(2)
      const originalPrice = p.original_price != null ? Number(p.original_price).toFixed(2) : null

      const shippingPrice = Number(price) >= 49 ? '0.00' : SHIPPING_MAX_EUR.toFixed(2)

      const lines: string[] = [
        '  <item>',
        `    <g:id>${esc(p.id)}</g:id>`,
        `    <g:title>${esc((p.title ?? '').slice(0, 150))}</g:title>`,
        `    <g:description>${esc((p.description ?? p.title ?? '').slice(0, 5000))}</g:description>`,
        `    <g:link>${esc(link)}</g:link>`,
        `    <g:image_link>${esc(image)}</g:image_link>`,
        `    <g:availability>${availability}</g:availability>`,
        `    <g:price>${price} EUR</g:price>`,
      ]

      if (originalPrice && Number(originalPrice) > Number(price)) {
        lines.push(`    <g:sale_price>${price} EUR</g:sale_price>`)
      }

      lines.push(
        `    <g:condition>new</g:condition>`,
        `    <g:brand>${brand}</g:brand>`,
      )

      if (gtin) lines.push(`    <g:gtin>${esc(gtin)}</g:gtin>`)
      if (mpn) lines.push(`    <g:mpn>${esc(mpn)}</g:mpn>`)
      lines.push(`    <g:identifier_exists>${hasGtinMpn ? 'yes' : 'no'}</g:identifier_exists>`)

      if (category) {
        lines.push(`    <g:product_type>${esc(category)}</g:product_type>`)
      }

      lines.push(
        `    <g:shipping>`,
        `      <g:country>DE</g:country>`,
        `      <g:service>Standard</g:service>`,
        `      <g:price>${shippingPrice} EUR</g:price>`,
        `      <g:min_handling_time>1</g:min_handling_time>`,
        `      <g:max_handling_time>3</g:max_handling_time>`,
        `      <g:min_transit_time>${SHIPPING_MIN_DAYS}</g:min_transit_time>`,
        `      <g:max_transit_time>${SHIPPING_MAX_DAYS}</g:max_transit_time>`,
        `    </g:shipping>`,
      )

      if (availability === 'preorder') {
        lines.push(`    <g:custom_label_0>preorder</g:custom_label_0>`)
      }

      lines.push('  </item>')
      return lines.join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>ShopSIN Produktfeed</title>
  <link>${SITE_URL}</link>
  <description>ShopSIN Google Merchant Feed</description>
${items}
</channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600',
    },
  })
}
