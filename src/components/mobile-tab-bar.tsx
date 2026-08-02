// Purpose: Mobile bottom navigation bar (app-like experience)
// Docs: AGENTS.md

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Percent, Heart, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CartDrawerTrigger } from './cart/cart-drawer-trigger'

const tabs = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/produkte', label: 'Kategorien', icon: LayoutGrid },
  { href: '/sale', label: 'Sale', icon: Percent, highlight: true },
  { href: '/wunschliste', label: 'Merkliste', icon: Heart },
  { href: '/warenkorb', label: 'Warenkorb', icon: ShoppingCart, showBadge: true },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    function update() {
      try {
        const raw = localStorage.getItem('sin-cart')
        const items = raw ? JSON.parse(raw) : []
        const total = (Array.isArray(items) ? items : []).reduce(
          (s: number, i: any) => s + (Number(i.quantity) || 0),
          0,
        )
        setCartCount(total)
      } catch {
        setCartCount(0)
      }
    }
    update()
    window.addEventListener('cart-updated', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('cart-updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <nav
      aria-label="Hauptnavigation mobil"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg"
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const isCart = tab.href === '/warenkorb'

          const content = (
            <>
              <span className="relative">
                <tab.icon
                  className={`size-6 transition-transform ${active ? 'scale-110' : ''}`}
                  aria-hidden="true"
                  strokeWidth={active ? 2.5 : 2}
                />
                {tab.showBadge && cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-sale text-[10px] font-bold text-sale-foreground shadow-sm"
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </span>
              {tab.label}
              {tab.showBadge && cartCount > 0 && (
                <span className="sr-only">, {cartCount} Artikel</span>
              )}
            </>
          )

          const className = `relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
            active
              ? 'text-primary'
              : tab.highlight
                ? 'text-sale hover:text-sale/80'
                : 'text-muted-foreground hover:text-foreground'
          }`

          return (
            <li key={tab.href} className="flex-1">
              {isCart ? (
                <CartDrawerTrigger ariaLabel="Warenkorb öffnen">
                  <div className={className}>{content}</div>
                </CartDrawerTrigger>
              ) : (
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={className}
                >
                  {content}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
