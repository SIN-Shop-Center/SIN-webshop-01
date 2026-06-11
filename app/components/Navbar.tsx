// Purpose: Top navigation bar with cart badge, wishlist link, account link
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10 — a11y + icon nav)

import Link from 'next/link'
import { getCartCount } from '@/lib/actions/cart'
import { CartIcon, HeartIcon, PackageIcon } from './icons'

export async function Navbar() {
  const cartCount = await getCartCount()
  const cartLabel =
    cartCount > 0
      ? `Warenkorb, ${cartCount > 9 ? '9 oder mehr' : cartCount} Artikel`
      : 'Warenkorb'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          ShopSIN
        </Link>
        <nav aria-label="Hauptnavigation" className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/wunschliste"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <HeartIcon className="size-5" aria-hidden />
            <span className="sr-only">Wunschliste</span>
          </Link>
          <Link
            href="/konto/bestellungen"
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <PackageIcon className="size-5" aria-hidden />
            <span className="sr-only">Meine Bestellungen</span>
          </Link>
          <Link
            href="/warenkorb"
            aria-label={cartLabel}
            className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
          >
            <CartIcon className="size-5" aria-hidden />
            <span className="sr-only">{cartLabel}</span>
            {cartCount > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
