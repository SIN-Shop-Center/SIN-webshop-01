import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CookieConsent } from '@/components/cookie-consent'

const inter = Inter({ subsets: ['latin'], display: 'swap' })
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
    url: `${APP_URL}/kontakt`,
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ShopSIN — Produkte mit geprüften Daten',
    template: '%s — ShopSIN',
  },
  description:
    'Ausgewählte Produkte mit transparenten Produktdaten, nachvollziehbarer Lieferung und sicherer Zahlung.',
  applicationName: 'ShopSIN',
  keywords: ['ShopSIN', 'Onlineshop', 'Wohnen', 'Elektronik', 'Lifestyle'],
  creator: 'ShopSIN',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'ShopSIN',
    url: APP_URL,
    title: 'ShopSIN — Produkte mit geprüften Daten',
    description:
      'Ausgewählte Produkte mit transparenten Produktdaten, nachvollziehbarer Lieferung und sicherer Zahlung.',
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: 'ShopSIN' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopSIN — Produkte mit geprüften Daten',
    description:
      'Ausgewählte Produkte mit transparenten Produktdaten, nachvollziehbarer Lieferung und sicherer Zahlung.',
    images: [`${APP_URL}/og-image.png`],
  },
  alternates: { canonical: APP_URL },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = 'de'
  setRequestLocale(locale)
  const messages = await getMessages({ locale })

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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Zum Hauptinhalt springen
        </a>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Navbar />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
