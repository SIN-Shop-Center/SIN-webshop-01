'use client'

import {useState, useRef, useCallback, useEffect} from 'react'
import Link from 'next/link'
import {ChevronDown} from 'lucide-react'
import {useTranslations} from 'next-intl'
import type {GroupedCategory} from '@/lib/category-groups'
import {translateCategory} from '@/lib/category-labels'

export function MegaMenu({groups}: {groups: GroupedCategory[]}) {
  const t = useTranslations('megaMenu')
  const [open, setOpen] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const openMenu = useCallback((label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(label)
  }, [])

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(null), 150)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(null)
        menuRef.current?.querySelector<HTMLButtonElement>(`[aria-expanded="true"]`)?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  return (
    <nav ref={menuRef} aria-label="Kategorien" className="relative border-b border-border bg-background">
      <div className="container mx-auto flex items-center gap-1 overflow-x-auto px-4 py-1 lg:overflow-visible">
        <Link
          href="/sale"
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-sale hover:bg-sale/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('sale')}
        </Link>
        <Link
          href="/produkte"
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('allProducts')}
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
              className={`flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
                        className="block rounded-md px-2 py-1.5 text-sm text-foreground/90 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
