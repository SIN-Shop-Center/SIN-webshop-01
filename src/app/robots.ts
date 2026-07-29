// Purpose: robots.txt — disallow private/auth/api routes (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/konto/', '/warenkorb/', '/wunschliste/', '/kasse/', '/auth/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
