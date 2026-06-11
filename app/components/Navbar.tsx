// Purpose: Top navigation bar with cart badge (Step 3 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import { getCartCount } from '@/lib/actions/cart'

export async function Navbar() {
  const cartCount = await getCartCount()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          SIN Shop
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="hidden text-sm font-medium hover:text-primary md:block">
            Home
          </Link>
          <Link href="/wunschliste" className="text-sm font-medium hover:text-primary">
            Wunschliste
          </Link>
          <Link href="/warenkorb" className="relative text-sm font-medium hover:text-primary">
            Warenkorb
            {cartCount > 0 && (
              <span className="absolute -right-4 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
