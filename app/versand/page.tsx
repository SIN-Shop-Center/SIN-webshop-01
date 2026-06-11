// Purpose: Versand page with real shipping info (Step 5/7)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import Link from 'next/link'
import { STOREFRONT_FOOTER_LEGAL_NOTE, STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'

export default function VersandPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold">Versandinformationen</h1>

      <p className="mb-6 text-pretty">
        Wir versenden unsere Produkte in den DACH-Raum (Deutschland, Österreich,
        Schweiz). Die Versandkosten werden im Checkout vor Abgabe der Bestellung
        deutlich ausgewiesen.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Lieferzeiten</h2>
      <p className="mb-6 text-pretty">
        Da die Waren direkt vom Logistikpartner (CJ Dropshipping) aus dem
        internationalen Lager (überwiegend China) versendet werden, beträgt die
        übliche Lieferzeit <strong>7–15 Werktage</strong> ab Bestelleingang. In
        Einzelfällen (z.B. Zollabfertigung, höheres Bestellaufkommen) kann die
        Lieferung länger dauern.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Sendungsverfolgung</h2>
      <p className="mb-6 text-pretty">
        Sobald deine Bestellung unser Lager verlässt, erhältst du eine
        Versandbestätigung mit einer Tracking-Nummer per E-Mail. Die Verfolgung
        ist über{' '}
        <a
          href="https://t.17track.net"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline"
        >
          17track.net
        </a>{' '}
        möglich.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Zoll & Einfuhrumsatzsteuer</h2>
      <p className="mb-6 text-pretty">
        Bei Sendungen in die Schweiz und nach Liechtenstein können Zollgebühren
        und Einfuhrumsatzsteuer anfallen, die vom Käufer zu tragen sind.
        Sendungen innerhalb der EU (DE, AT) sind zollfrei.
      </p>

      <h2 className="mb-3 text-xl font-semibold">Teillieferungen</h2>
      <p className="mb-6 text-pretty">
        Teillieferungen sind zulässig, soweit sie für dich zumutbar sind.
        Gegebenenfalls entstehen nur einmal Versandkosten.
      </p>

      <p className="mb-8 text-pretty">
        Genauere Informationen findest du in unseren{' '}
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
