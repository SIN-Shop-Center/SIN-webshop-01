import type {Metadata, Viewport} from 'next'
import {Inter} from 'next/font/google'
import './globals.css'

const inter = Inter({subsets: ['latin'], display: 'swap'})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopsin.delqhi.com'

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ShopSIN',
  url: APP_URL,
  logo: `${APP_URL}/logo.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['German', 'English'],
  },
  sameAs: [],
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ShopSIN — Dein Alltag. Unser Sortiment.',
    template: '%s — ShopSIN',
  },
  description:
    'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
  applicationName: 'ShopSIN',
  keywords: [
    'ShopSIN',
    'Onlineshop',
    'Mode',
    'Wohnen',
    'Elektronik',
    'Lifestyle',
    'Accessoires',
  ],
  authors: [{name: 'Jeremy Schulze'}],
  creator: 'ShopSIN',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'ShopSIN',
    url: APP_URL,
    title: 'ShopSIN — Premium Tech & Lifestyle',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: 'ShopSIN' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopSIN — Dein Alltag. Unser Sortiment.',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: {
    canonical: APP_URL,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#ffffff'},
    {media: '(prefers-color-scheme: dark)', color: '#0a0a0a'},
  ],
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const locale = 'de'

  return (
    <html lang={locale} className={`${inter.className} bg-background`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body className="flex min-h-svh flex-col bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Zum Hauptinhalt springen
        </a>
        {children}
      </body>
    </html>
  )
}
