// Purpose: robots.txt — disallow private/auth routes (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/konto', '/warenkorb', '/wunschliste', '/kasse', '/auth'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
