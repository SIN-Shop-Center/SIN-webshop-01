import type { MetadataRoute } from 'next'
import { getInitialCatalogProducts } from '@/lib/server/catalog-list'
import { absoluteUrl } from '@/lib/site'
import { STOREFRONT_LEGAL_LINKS, STOREFRONT_LEGAL_PAGES } from '@/lib/storefront-legal'

const STATIC_ROUTES = [
  '/',
  '/products',
  '/about',
  '/faq',
  '/kontakt',
  '/versand',
  '/rueckgabe',
  ...STOREFRONT_LEGAL_LINKS.map((link) => link.href),
]

function safeLastModified(input: string, fallback: Date): Date {
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }
  return parsed
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const products = await getInitialCatalogProducts(500)

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }))

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${encodeURIComponent(product.id)}`),
    lastModified: safeLastModified(product.updatedAt, now),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticEntries, ...productEntries]
}
