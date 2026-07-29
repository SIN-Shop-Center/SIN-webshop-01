// Purpose: /kasse/* layout — disallow indexing
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kasse',
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
