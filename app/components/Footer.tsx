// Purpose: Footer with brand, shop links, legal links (Step 10 polish)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import {
  STOREFRONT_FOOTER_LEGAL_NOTE,
  STOREFRONT_LEGAL_LINKS,
} from '../../config/storefront-legal'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <h3 className="mb-3 text-base font-semibold tracking-tight">ShopSIN</h3>
            <p className="max-w-md text-sm text-muted-foreground text-pretty">
              {STOREFRONT_FOOTER_LEGAL_NOTE}
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Shop</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/produkte" className="hover:text-foreground">
                  Alle Produkte
                </Link>
              </li>
              <li>
                <Link href="/versand" className="hover:text-foreground">
                  Versand
                </Link>
              </li>
              <li>
                <Link href="/kontakt" className="hover:text-foreground">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/konto/bestellungen" className="hover:text-foreground">
                  Meine Bestellungen
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {STOREFRONT_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} ShopSIN · Jeremy Schulze · Kurfürstenstraße 124,
            10785 Berlin · opensin@gmx.com
          </p>
        </div>
      </div>
    </footer>
  )
}
