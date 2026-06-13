// Purpose: Compact category dropdown for the main navbar
// Docs: AGENTS.md

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, LayoutGrid } from 'lucide-react'
import type { GroupedCategory } from '@/lib/category-groups'
import { translateCategory } from '@/lib/category-labels'

export function NavbarCategoryMenu({ groups }: { groups: GroupedCategory[] }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const openMenu = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (groups.length === 0) return null

  return (
    <div ref={menuRef} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          open
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
        Kategorien
        <ChevronDown
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-[560px] rounded-xl border border-border bg-background p-4 shadow-xl"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="grid gap-0.5">
                  {group.categories.slice(0, 6).map((cat) => (
                    <li key={cat.id}>
                      <Link
                        role="menuitem"
                        href={`/produkte?kategorie=${cat.id}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {translateCategory(cat.name)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <Link
              href="/produkte"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Alle Produkte ansehen
              <ChevronDown className="size-4 -rotate-90" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
