// Purpose: Root layout — Inter font, skip-link, flex column, viewport meta (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from './components/Navbar'
import { CategoryNav } from './components/category-nav'
import { CookieConsent } from './components/cookie-consent'
import { Footer } from './components/Footer'
import { AnnouncementBar } from '@/components/conversion/announcement-bar'
import { ExitIntentOffer } from '@/components/conversion/exit-intent-offer'
import { MobileTabBar } from '@/components/mobile-tab-bar'
import { NewsletterCapture } from '@/components/conversion/newsletter-capture'
import { FloatingRatingBadge } from '@/components/floating-rating-badge'
import { UspTopbar } from '@/components/usp-topbar'
import { FloatingTrustBadge } from '@/components/floating-trust-badge'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

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
  authors: [{ name: 'Jeremy Schulze' }],
  creator: 'ShopSIN',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'ShopSIN',
    url: APP_URL,
    title: 'ShopSIN — Premium Tech & Lifestyle',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopSIN — Dein Alltag. Unser Sortiment.',
    description:
      'Handverlesene Produkte aus Mode, Wohnen, Elektronik und mehr — mit kostenlosem Versand ab 49 €.',
  },
  alternates: {
    canonical: APP_URL,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className={`${inter.className} bg-background`}>
      <body className="flex min-h-svh flex-col bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Zum Hauptinhalt springen
        </a>
        <UspTopbar />
        <AnnouncementBar />
        <Navbar />
        <CategoryNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CookieConsent />
        <ExitIntentOffer />
        <NewsletterCapture />
        <MobileTabBar />
        <FloatingRatingBadge />
        <FloatingTrustBadge count={0} />
      </body>
    </html>
  )
}
