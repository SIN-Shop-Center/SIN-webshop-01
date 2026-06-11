// Purpose: Root layout — Inter font, skip-link, flex column, viewport meta (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'ShopSIN — Premium Tech & Lifestyle',
    template: '%s — ShopSIN',
  },
  description:
    'Handverlesene Tech- und Lifestyle-Produkte mit kostenlosem Versand ab 49 €. Premium Tech & Lifestyle für deinen Alltag.',
  applicationName: 'ShopSIN',
  keywords: [
    'ShopSIN',
    'Premium Tech',
    'Lifestyle',
    'Kopfhörer',
    'Tastatur',
    'Leder',
    'Smartwatch',
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
      'Handverlesene Tech- und Lifestyle-Produkte mit kostenlosem Versand ab 49 €.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShopSIN — Premium Tech & Lifestyle',
    description:
      'Handverlesene Tech- und Lifestyle-Produkte mit kostenlosem Versand ab 49 €.',
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
    <html lang="de" className={inter.className}>
      <body className="flex min-h-svh flex-col bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Zum Hauptinhalt springen
        </a>
        <Navbar />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
