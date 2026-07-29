import Link from 'next/link'
import { Search, ShoppingBag, UserRound } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/produkte', label: 'Produkte' },
  { href: '/sale', label: 'Preisvorteile' },
  { href: '/hilfe/versand', label: 'Versand' },
  { href: '/kontakt', label: 'Hilfe' },
] as const

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-[-0.035em]"
          aria-label="ShopSIN Startseite"
        >
          ShopSIN
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          action="/search"
          method="GET"
          role="search"
          className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 focus-within:border-foreground md:flex"
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            type="search"
            name="q"
            required
            aria-label="Produkte suchen"
            placeholder="Produkte suchen"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/search"
            aria-label="Suche öffnen"
            className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <Search className="size-4.5" aria-hidden />
          </Link>
          <Link
            href="/konto"
            aria-label="Konto öffnen"
            className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <UserRound className="size-4.5" aria-hidden />
          </Link>
          <Link
            href="/warenkorb"
            aria-label="Warenkorb öffnen"
            className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingBag className="size-4.5" aria-hidden />
          </Link>
        </div>
      </div>

      <nav className="container mx-auto flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden" aria-label="Mobile Hauptnavigation">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
