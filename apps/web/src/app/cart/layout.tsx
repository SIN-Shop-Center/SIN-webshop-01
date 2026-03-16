import type { Metadata } from 'next'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Warenkorb',
  description: 'Warenkorb mit klaren Gesamtkosten, Versandlogik und nächstem Schritt in den Checkout.',
  path: '/cart',
  noIndex: true,
})

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children
}
