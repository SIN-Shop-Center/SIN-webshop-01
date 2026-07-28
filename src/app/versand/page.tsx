// Purpose: Versand page with sections, table, links (Step 9 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import Link from 'next/link'
import { SHIPPING } from '@/lib/shipping'
import { formatEuro } from '@/lib/format'
import { STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'
import { ExternalLinkIcon } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Versand & Lieferung',
  description:
    'Versandkosten, Lieferzeiten und Sendungsverfolgung bei ShopSIN.',
}

export default function VersandPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
        Versand &amp; Lieferung
      </h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Alle Informationen zu Versandkosten, Lieferzeiten und
        Sendungsverfolgung.
      </p>

      <div className="flex flex-col gap-8 leading-relaxed">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Versandkosten</h2>
          <div className="overflow-hidden rounded-lg border border-border text-sm">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-border bg-muted/30">
                  <td className="px-4 py-3 font-medium">Standardversand</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatEuro(SHIPPING.standardCents)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Kostenloser Versand ab
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatEuro(SHIPPING.freeAboveCents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Lieferzeit</h2>
          <p className="text-pretty text-muted-foreground">
            Die Lieferzeit beträgt in der Regel {SHIPPING.deliveryDaysMin} bis{' '}
            {SHIPPING.deliveryDaysMax} Werktage. Der Versand erfolgt aus
            unserem internationalen Lager. Sobald deine Bestellung versendet
            wurde, erhältst du eine E-Mail mit der Sendungsverfolgungsnummer.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Liefergebiete</h2>
          <p className="text-muted-foreground">
            Wir liefern nach Deutschland, Österreich und in die Schweiz. Für
            Lieferungen in die Schweiz können zusätzliche Zollgebühren und
            Einfuhrabgaben anfallen, die vom Empfänger zu tragen sind.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Sendungsverfolgung</h2>
          <p className="text-pretty text-muted-foreground">
            Sobald deine Bestellung unser Lager verlässt, erhältst du eine
            Versandbestätigung mit einer Tracking-Nummer per E-Mail. Die
            Verfolgung ist über{' '}
            <a
              href="https://t.17track.net"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline"
            >
              17track.net
              <ExternalLinkIcon className="size-3.5" aria-hidden />
            </a>{' '}
            möglich.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">Teillieferungen</h2>
          <p className="text-muted-foreground">
            Teillieferungen sind zulässig, soweit sie für dich zumutbar sind.
            Gegebenenfalls entstehen nur einmal Versandkosten.
          </p>
        </section>
      </div>

      <nav
        aria-label="Rechtliche Hinweise"
        className="mt-12 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground"
      >
        {STOREFRONT_LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="underline hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
