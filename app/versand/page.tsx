// Purpose: Versand page (Step 5 — shipping info, placeholder content)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// NOTE: There is no versand entry in STOREFRONT_LEGAL_PAGES yet.
// This is a hardcoded placeholder page; once real shipping content is
// available, add it to config/storefront-legal and use LegalPage here.

import Link from 'next/link'
import { STOREFRONT_FOOTER_LEGAL_NOTE, STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'

export const dynamic = 'force-dynamic'

export default function VersandPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold">Versandinformationen</h1>
      <p className="mb-6 text-pretty">
        Wir versenden unsere Produkte weltweit, vorzugsweise im DACH-Raum
        (Deutschland, Österreich, Schweiz). Die Versandkosten werden im
        Checkout vor Abgabe der Bestellung deutlich ausgewiesen.
      </p>
      <p className="mb-6 text-pretty">
        Da die Waren direkt vom Logistikpartner (CJ Dropshipping) versendet
        werden, können Lieferzeiten je nach Herkunftsland variieren.
        Teillieferungen sind zulässig, soweit sie für dich zumutbar sind.
      </p>
      <p className="mb-8 text-pretty">
        Genauere Informationen zu Versandoptionen, Lieferzeiten und Kosten
        findest du in unseren{' '}
        <Link href="/agb" className="font-medium text-primary underline">
          AGB
        </Link>
        .
      </p>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        <p className="mb-3">{STOREFRONT_FOOTER_LEGAL_NOTE}</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          {STOREFRONT_LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="underline hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
