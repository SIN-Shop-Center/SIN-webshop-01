// Purpose: PWA manifest (Step 10 — installable)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ShopSIN — Premium Tech & Lifestyle',
    short_name: 'ShopSIN',
    description:
      'Handverlesene Tech- und Lifestyle-Produkte mit kostenlosem Versand ab 49 €.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a1a1a',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  }
}
