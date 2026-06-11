// Purpose: Footer with real legal links from config/storefront-legal
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import { STOREFRONT_FOOTER_LEGAL_NOTE, STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-sm font-semibold">Rechtliches</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {STOREFRONT_LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <h3 className="mb-4 text-sm font-semibold">ShopSIN</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              {STOREFRONT_FOOTER_LEGAL_NOTE}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Inh. Jeremy Schulze · Kurfürstenstraße 124, 10785 Berlin · opensin@gmx.com
            </p>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ShopSIN. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  )
}
