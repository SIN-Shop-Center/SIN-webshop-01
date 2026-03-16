'use client'

import Link from '@/components/ui/Link'
import { SegmentSwitch } from '@/features/segment'
import { cn } from '@/lib/utils'
import { MOBILE_NAV_ITEMS, type NavItem } from './navbar-items'

type NavbarMobileMenuProps = {
  isOpen: boolean
  buildNavHref: (item: NavItem) => string
  isNavItemActive: (item: NavItem) => boolean
  onClose: () => void
}

export function NavbarMobileMenu({ isOpen, buildNavHref, isNavItemActive, onClose }: NavbarMobileMenuProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="animate-slide-down space-y-3 border-t border-brand-border py-4 md:hidden">
      <div className="rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm text-brand-text-muted">
        <p className="font-semibold text-brand-text">Produkte schneller verstehen.</p>
        <p className="mt-1">Preis, Lieferung und Rückgabe bleiben bis zur Kasse sichtbar.</p>
      </div>
      <SegmentSwitch className="w-full justify-center" />
      <nav
        id="mobile-main-navigation"
        aria-label="Mobile Hauptnavigation"
        className="grid gap-1 rounded-2xl border border-brand-border bg-white/92 p-2"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item)
          return (
            <Link
              key={`${item.href}:${item.segment || 'all'}:${item.label}`}
              href={buildNavHref(item)}
              prefetch={false}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[2.75rem] min-w-[2.75rem] items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-black text-white' : 'text-brand-text-muted hover:bg-brand-bg-muted hover:text-brand-text',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="grid gap-2 text-xs text-brand-text-muted">
        <p className="rounded-full border border-brand-border bg-white px-3 py-2 text-center">Versand 24-48h</p>
        <p className="rounded-full border border-brand-border bg-white px-3 py-2 text-center">Hilfe in der Regel innerhalb von 24 Stunden</p>
      </div>
    </div>
  )
}

