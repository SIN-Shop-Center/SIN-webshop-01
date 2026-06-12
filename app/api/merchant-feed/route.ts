// Purpose: Google Merchant Center Produktfeed (RSS 2.0 / g:-Namespace) (Issue #57)
// Docs: https://support.google.com/merchants/answer/7052112

import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600 // stündlich neu generieren

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function GET() {
  const supabase = createAdminClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('id, slug, title, description, price, stock, image_url, image_url_local, is_active')
    .eq('is_active', true)
    .gt('price', 0)

  if (error) {
    return new Response('feed unavailable', { status: 500 })
  }

  const items = (products ?? [])
    .map((p) => {
      const link = `${SITE_URL}/produkt/${p.slug ?? p.id}`
      const image = p.image_url_local ?? p.image_url
      const availability = p.stock > 0 ? 'in_stock' : 'out_of_stock'
      return `  <item>
    <g:id>${esc(p.id)}</g:id>
    <g:title>${esc((p.title ?? '').slice(0, 150))}</g:title>
    <g:description>${esc((p.description ?? p.title ?? '').slice(0, 5000))}</g:description>
    <g:link>${esc(link)}</g:link>
    <g:image_link>${esc(image ?? '')}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:price>${Number(p.price).toFixed(2)} EUR</g:price>
    <g:condition>new</g:condition>
    <g:brand>ShopSIN</g:brand>
    <g:identifier_exists>no</g:identifier_exists>
    <g:shipping>
      <g:country>DE</g:country>
      <g:price>0.00 EUR</g:price>
    </g:shipping>
  </item>`
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
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
