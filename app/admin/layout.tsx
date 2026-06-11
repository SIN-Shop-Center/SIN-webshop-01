// Purpose: Admin shell with navigation (Step 8 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-guard'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <nav className="flex gap-4 text-sm font-medium">
          <Link href="/admin" className="hover:text-primary">
            Übersicht
          </Link>
          <Link href="/admin/bestellungen" className="hover:text-primary">
            Bestellungen
          </Link>
          <Link href="/admin/produkte" className="hover:text-primary">
            Produkte
          </Link>
          <Link href="/" className="text-muted-foreground hover:text-primary">
            Zum Shop
          </Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
