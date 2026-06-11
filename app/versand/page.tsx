// Purpose: Versand page with real shipping data (Step 9 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 9 — Customer orders + shipping)

import { SHIPPING } from '@/lib/shipping'
import Link from 'next/link'
import { STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'

export default function VersandPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Versand und Lieferung</h1>
      <div className="flex flex-col gap-6 leading-relaxed">
        <section>
          <h2 className="mb-2 text-xl font-semibold">Versandkosten</h2>
          <ul className="list-inside list-disc text-muted-foreground">
            <li>
              Standardversand: {(SHIPPING.standardCents / 100).toFixed(2)} €
            </li>
            <li>
              Kostenloser Versand ab einem Bestellwert von{' '}
              {(SHIPPING.freeAboveCents / 100).toFixed(2)} €
            </li>
          </ul>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Lieferzeit</h2>
          <p className="text-muted-foreground text-pretty">
            Die Lieferzeit beträgt in der Regel {SHIPPING.deliveryDaysMin} bis{' '}
            {SHIPPING.deliveryDaysMax} Werktage. Der Versand erfolgt aus unserem
            internationalen Lager. Sobald deine Bestellung versendet wurde,
            erhältst du eine E-Mail mit der Sendungsverfolgungsnummer.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Liefergebiete</h2>
          <p className="text-muted-foreground">
            Wir liefern nach Deutschland, Österreich und in die Schweiz. Für
            Lieferungen in die Schweiz können zusätzliche Zollgebühren und
            Einfuhrabgaben anfallen, die vom Empfänger zu tragen sind.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Sendungsverfolgung</h2>
          <p className="text-muted-foreground text-pretty">
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
        </section>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Teillieferungen</h2>
          <p className="text-muted-foreground">
            Teillieferungen sind zulässig, soweit sie für dich zumutbar sind.
            Gegebenenfalls entstehen nur einmal Versandkosten.
          </p>
        </section>
      </div>

      <nav className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
        {STOREFRONT_LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
