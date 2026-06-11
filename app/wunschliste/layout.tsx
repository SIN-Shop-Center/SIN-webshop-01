// Purpose: /wunschliste layout — disallow indexing
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wunschliste',
  robots: { index: false, follow: false },
}

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
