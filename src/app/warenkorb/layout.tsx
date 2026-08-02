// Purpose: /warenkorb layout — disallow indexing
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Warenkorb',
  robots: { index: false, follow: false },
}

export default function CartLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
