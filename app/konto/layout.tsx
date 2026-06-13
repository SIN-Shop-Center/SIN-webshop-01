// Purpose: /konto/* layout — disallow indexing
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mein Konto',
  robots: { index: false, follow: false },
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
