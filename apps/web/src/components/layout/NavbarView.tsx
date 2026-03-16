'use client'

import type { RefObject } from 'react'
import Link from '@/components/ui/Link'
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { PromotionBannerStrip } from '@/features/promotions'
import { SegmentSwitch } from '@/features/segment'
import { cn } from '@/lib/utils'
import type { CustomerSegment } from '@simone/contracts'
import { NAV_ITEMS, type NavItem } from './navbar-items'
import { NavbarMobileMenu } from './NavbarMobileMenu'

type NavbarViewProps = {
  headerContentRef: RefObject<HTMLDivElement>
  isHeaderCollapsed: boolean
  expandedHeaderHeight: number
  segment: CustomerSegment
  searchQuery: string
  itemCount: number
  isMobileMenuOpen: boolean
  buildNavHref: (item: NavItem) => string
  isNavItemActive: (item: NavItem) => boolean
  onCloseMobileMenu: () => void
  onToggleMobileMenu: () => void
  onToggleCart: () => void
}

export function NavbarView({
  headerContentRef,
  isHeaderCollapsed,
  expandedHeaderHeight,
  segment,
  searchQuery,
  itemCount,
  isMobileMenuOpen,
  buildNavHref,
  isNavItemActive,
  onCloseMobileMenu,
  onToggleMobileMenu,
  onToggleCart,
}: NavbarViewProps) {
  return (
    <header
      id="site-header"
      className={cn(
        'sticky top-0 z-40 glass-panel overflow-hidden transition-[height] duration-200 ease-out will-change-[height]',
        isHeaderCollapsed ? 'border-b-0' : '',
      )}
      style={{ height: isHeaderCollapsed ? 0 : expandedHeaderHeight || undefined }}
    >
      <div
        ref={headerContentRef}
        className={cn(
          'transition-transform duration-200 ease-out will-change-transform',
          isHeaderCollapsed ? '-translate-y-full' : 'translate-y-0',
        )}
      >
        <PromotionBannerStrip placement="header" segment={segment} variant="header" className="border-b border-brand-border/60" />
        <div className="shell-container">
          <div className="flex min-h-[5.6rem] min-w-0 items-center gap-3">
            <Link href="/" className="mr-3 inline-flex min-h-[2.75rem] flex-shrink-0 items-center gap-3" onClick={onCloseMobileMenu}>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">SS</span>
              <span className="leading-none">
                <span className="block text-base font-semibold tracking-tight text-brand-text md:text-lg">Simone Shop</span>
                <span className="block text-[0.66rem] uppercase tracking-[0.18em] text-brand-text-muted">Preis. Lieferung. Klarheit.</span>
              </span>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex" aria-label="Hauptnavigation">
              {NAV_ITEMS.map((item) => {
                const active = isNavItemActive(item)
                return (
                  <Link
                    key={`${item.href}:${item.segment || 'all'}:${item.label}`}
                    href={buildNavHref(item)}
                    prefetch={false}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'ui-pill text-sm flex-shrink-0',
                      active ? 'ui-pill-active shadow-sm' : 'ui-pill-muted',
                      item.className,
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 2xl:flex">
                <Link href="/versand" prefetch={false} className="ui-pill ui-pill-muted text-sm">
                  Versand 24-48h
                </Link>
                <Link href="/rueckgabe" prefetch={false} className="ui-pill ui-pill-muted text-sm">
                  30 Tage Rückgabe
                </Link>
              </div>

              <div className="flex items-center gap-1 md:ml-4">
                <div className="hidden md:block">
                  <SegmentSwitch />
                </div>

                <form
                  action="/products"
                  method="get"
                  className="hidden min-h-[2.75rem] items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-sm text-brand-text-muted md:flex"
                >
                  <Search className="h-4 w-4 text-brand-text-muted" />
                  <input
                    key={searchQuery}
                    name="search"
                    defaultValue={searchQuery}
                    aria-label="Produkte suchen"
                    placeholder="Produkte suchen"
                    className="w-44 bg-transparent text-sm text-brand-text placeholder:text-brand-text-muted focus:outline-none lg:w-52"
                  />
                </form>

                <Link href="/kundencenter" prefetch={false} className="ui-pill ui-pill-muted hidden text-sm lg:inline-flex">
                  Konto
                </Link>
                <Link href="/kontakt" prefetch={false} className="ui-pill ui-pill-muted hidden text-sm lg:inline-flex">
                  Hilfe & Kontakt
                </Link>
                <Link href="/products?segment=b2b" prefetch={false} className="ui-pill ui-pill-muted hidden text-sm 2xl:inline-flex">
                  Firmenkauf
                </Link>

                <Link href="/products" aria-label="Produkte suchen" className="ui-icon-btn md:hidden">
                  <Search className="h-5 w-5" />
                </Link>

                <button type="button" aria-label="Warenkorb öffnen" onClick={onToggleCart} className="ui-icon-btn relative">
                  <ShoppingBag className="h-5 w-5" />
                  {itemCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-black px-1 text-xs font-semibold text-white">
                      {itemCount}
                    </span>
                  ) : null}
                </button>

                <Link href="/kundencenter" prefetch={false} aria-label="Kundencenter" className="ui-icon-btn">
                  <User className="h-5 w-5" />
                </Link>

                <button
                  type="button"
                  onClick={onToggleMobileMenu}
                  className="ui-icon-btn md:hidden"
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-main-navigation"
                  aria-label="Menü öffnen"
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <NavbarMobileMenu
            isOpen={isMobileMenuOpen}
            buildNavHref={buildNavHref}
            isNavItemActive={isNavItemActive}
            onClose={onCloseMobileMenu}
          />
        </div>
      </div>
    </header>
  )
}
