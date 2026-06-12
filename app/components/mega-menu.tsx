// Purpose: Amazon/Temu-style mega-menu with grouped categories
// Docs: AGENTS.md

'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { GroupedCategory } from '@/lib/category-groups'
import { translateCategory } from '@/lib/category-labels'

export function MegaMenu({ groups }: { groups: GroupedCategory[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openMenu = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(label)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(null), 150)
  }, [])

  return (
    <nav aria-label="Kategorien" className="relative border-b border-border bg-background">
      <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-4 py-1 lg:overflow-visible">
        <Link
          href="/sale"
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-sale hover:bg-sale/10"
        >
          Sale %
        </Link>
        <Link
          href="/produkte"
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Alle Produkte
        </Link>

        {groups.map((group) => (
          <div
            key={group.label}
            className="relative"
            onMouseEnter={() => openMenu(group.label)}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              aria-expanded={open === group.label}
              aria-haspopup="true"
              onClick={() => setOpen(open === group.label ? null : group.label)}
              className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                open === group.label
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {group.label}
              <ChevronDown
                className={`size-3.5 transition-transform ${open === group.label ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {open === group.label && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-popover p-3 shadow-lg"
                onMouseEnter={() => openMenu(group.label)}
                onMouseLeave={scheduleClose}
              >
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="grid gap-0.5">
                  {group.categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        role="menuitem"
                        href={`/produkte?kategorie=${cat.id}`}
                        onClick={() => setOpen(null)}
                        className="block rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted hover:text-foreground"
                      >
                        {translateCategory(cat.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  )
}
