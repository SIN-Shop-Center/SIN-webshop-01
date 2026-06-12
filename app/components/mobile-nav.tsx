// Purpose: Mobile hamburger navigation with categories + account link
// Docs: AGENTS.md

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MenuIcon, XIcon } from './icons'
import type { Category } from '@/lib/supabase/queries'

export function MobileNav({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
      >
        <MenuIcon aria-hidden className="size-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-lg font-bold text-foreground">Menü</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
              className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
            >
              <XIcon aria-hidden className="size-6" />
            </button>
          </div>
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1 p-4">
            <Link
              href="/produkte"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-semibold text-foreground hover:bg-muted"
            >
              Alle Produkte
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/kategorie/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
            <hr className="my-3 border-border" />
            <Link
              href="/konto"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Mein Konto
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
