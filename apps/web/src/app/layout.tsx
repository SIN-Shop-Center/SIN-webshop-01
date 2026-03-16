import type { Metadata, Viewport } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { JsonLd } from '@/components/seo/JsonLd'
import { DEFAULT_LOCALE, SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from '@/lib/site'
import { Providers } from './providers'
import { SiteChrome } from '@/components/layout/SiteChrome'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: getSiteUrl(),
  sameAs: [],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: getSiteUrl(),
  potentialAction: {
    '@type': 'SearchAction',
    target: `${getSiteUrl()}/products?search={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} - Produkte schneller verstehen. Sicherer entscheiden.`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: '/',
  },
  manifest: '/manifest.webmanifest',
  category: 'shopping',
  keywords: ['Online-Shop', 'B2B', 'B2C', 'klare Preise', 'Deutschland', 'Simone Shop'],
  authors: [{ name: 'Simone Schulze' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: `${SITE_NAME} - Produkte schneller verstehen. Sicherer entscheiden.`,
    description: SITE_DESCRIPTION,
    url: '/',
    type: 'website',
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Produkte schneller verstehen. Sicherer entscheiden.`,
    description: SITE_DESCRIPTION,
    images: ['/twitter-image'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#101010',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-brand-bg font-sans text-brand-text`}>
        <JsonLd id="org-jsonld" data={organizationJsonLd} />
        <JsonLd id="website-jsonld" data={websiteJsonLd} />
        <Providers>
          <a
            href="#main-content"
            className="sr-only absolute left-2 top-2 z-[120] inline-flex min-h-[2.75rem] items-center rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white focus:not-sr-only"
          >
            Zum Hauptinhalt springen
          </a>
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              <SiteChrome>{children}</SiteChrome>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
