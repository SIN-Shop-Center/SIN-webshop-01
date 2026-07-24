// Purpose: Mobile hamburger navigation with accordion category groups
// Docs: AGENTS.md

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown } from 'lucide-react'
import type { GroupedCategory } from '@/lib/category-groups'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export function MobileNav({ groups }: { groups: GroupedCategory[] }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const trapRef = useFocusTrap(open, { onEscape: () => setOpen(false) })

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
      >
        <Menu aria-hidden className="size-6" />
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-lg font-bold text-foreground">Menü</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
              className="rounded-md p-2 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden className="size-6" />
            </button>
          </div>
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1 overflow-y-auto p-4">
            <Link
              href="/sale"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-semibold text-sale hover:bg-sale/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sale %
            </Link>
            <Link
              href="/produkte"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Alle Produkte
            </Link>

            {groups.map((group) => {
              const isExpanded = expanded === group.label
              return (
                <div key={group.label} className="border-b border-border last:border-0">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : group.label)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {group.label}
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isExpanded && (
                    <ul className="pb-2 pl-4">
                      {group.categories.map((cat) => (
                        <li key={cat.id}>
                          <Link
                            href={`/produkte?kategorie=${cat.id}`}
                            onClick={() => setOpen(false)}
                            className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {cat.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}

            <hr className="my-3 border-border" />
            <Link
              href="/konto"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mein Konto
            </Link>
            <Link
              href="/wunschliste"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Wunschliste
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}
