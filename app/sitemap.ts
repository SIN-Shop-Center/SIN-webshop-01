// Purpose: sitemap.xml — static + product pages (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

interface SitemapProduct {
  id: string
  slug: string | null
  updated_at: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: SitemapProduct[] = []
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('products_v')
      .select('id, slug, updated_at')
      .eq('is_active', true)
    products = (data ?? []) as SitemapProduct[]
  } catch {
    products = []
  }

  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/produkte`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/sale`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/versand`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/kontakt`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/agb`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/impressum`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/widerrufsrecht`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/produkt/${p.slug ?? p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...productPages]
}
