// Purpose: Mobile bottom navigation bar (app-like experience)
// Docs: AGENTS.md

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Percent, Heart, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from 'react'

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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  active ? 'text-primary' : tab.highlight ? 'text-sale' : 'text-muted-foreground'
                }`}
              >
                <span className="relative">
                  <tab.icon className="size-5" aria-hidden="true" />
                  {tab.showBadge && cartCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-sale text-[9px] font-bold text-sale-foreground">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
