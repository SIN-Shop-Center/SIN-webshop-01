// Purpose: Root layout for Next.js 16 storefront migration (Step 1)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShopSIN — Premium Tech & Lifestyle',
  description: 'Premium Tech & Lifestyle Products',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="bg-background">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
