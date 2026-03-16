import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Bestellstatus',
  description: 'Statusseite nach dem Checkout mit Bestellnummer, Zahlungsstand und nächsten Schritten.',
  path: '/checkout/success',
  noIndex: true,
})

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children
}
