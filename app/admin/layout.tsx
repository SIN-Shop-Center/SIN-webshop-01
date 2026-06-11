// Purpose: Admin shell with navigation (Step 8 + Step 10 polish)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-guard'
import { AlertCircleIcon, ExternalLinkIcon } from '@/components/icons'

const NAV_LINKS = [
  { href: '/admin', label: 'Übersicht' },
  { href: '/admin/bestellungen', label: 'Bestellungen' },
  { href: '/admin/produkte', label: 'Produkte' },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <nav
          aria-label="Admin-Navigation"
          className="flex flex-wrap items-center gap-1 text-sm font-medium"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Zum Shop
            <ExternalLinkIcon className="size-3.5" aria-hidden />
          </Link>
        </nav>
      </div>
      {children}
    </div>
  )
}
