// Purpose: /auth/* layout — disallow indexing (Step 10 — SEO)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Konto',
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
