// Purpose: PWA manifest (Step 10 — installable, Issue #34 Branded-Icons)
// Docs: PLAN-VERKAUFSFAEHIG.md
//
// Hinweis: 192x192 + 512x512 sind Pflicht für "Zum Startbildschirm
// hinzufügen" auf Android. Maskable-Variante braucht Safe-Zone 80% zentriert
// (iOS/Android schneiden Ränder ab).

import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ShopSIN — Premium Tech & Lifestyle',
    short_name: 'ShopSIN',
    description:
      'Handverlesene Tech- und Lifestyle-Produkte mit kostenlosem Versand ab 49 €.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1a1a',
    theme_color: '#1a1a1a',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
