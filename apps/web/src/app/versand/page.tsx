import type { Metadata } from 'next'
import { Truck } from 'lucide-react'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Versand und Lieferung',
  description: 'Versandkosten, Lieferzeiten und Tracking bei Delqhi.',
  path: '/versand',
})

export default function VersandPage() {
  return (
    <InfoPage
      title="Versand & Lieferung"
      intro="Versandkosten, Lieferzeiten und Tracking sind vor dem Kauf sichtbar und im Checkout verstaendlich aufgeschluesselt."
      tone="cool"
      heroIcon={<Truck className="h-5 w-5" />}
      highlights={[
        { label: 'Lieferzeit', value: '6-15 Werktage' },
        { label: 'Versandkosten', value: '4,99 EUR' },
        { label: 'Tracking', value: 'per E-Mail' },
      ]}
      eyebrow="Versand"
      sidebarEyebrow="Lieferstatus"
      sidebarTitle="Tracking & Adresse"
      sidebarIntro="Schneller Ueberblick zu Versand, Zustellung und Ablage."
      sidebarFootnote="Wir helfen bei Versand, Tracking und Adressaenderungen."
      primaryCta={{ label: 'Tracking anfragen', href: '/kontakt' }}
      secondaryCta={{ label: 'Rueckgabe ansehen', href: '/rueckgabe' }}
      sections={[
        {
          title: 'Versandkosten',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Standardversand: 4,99 EUR</li>
              <li>Kostenfrei ab: 50 EUR Warenwert</li>
              <li>Liefergebiet: Deutschland, Oesterreich, Schweiz</li>
            </ul>
          ),
        },
        {
          title: 'Lieferzeiten',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Standard: 6-15 Werktage (je nach Produkt und Logistikpartner)</li>
              <li>Die Lieferzeit beginnt mit der Versandbestaetigung per E-Mail</li>
              <li>Bei hoher Nachfrage kann die Bearbeitung 1-2 Werktage laenger dauern</li>
            </ul>
          ),
        },
        {
          title: 'Hinweis zum Dropshipping-Versand',
          body: 'Die Ware wird von unserem Logistikpartner direkt an dich versendet. Dadurch koennen Lieferzeiten je nach Herkunftsland und Zollabfertigung variieren. Die im Checkout angegebene Lieferzeit ist ein Richtwert.',
        },
        {
          title: 'Tracking & Zustellung',
          body: 'Nach Versand erhaelst du eine E-Mail mit einer Tracking-Nummer. Damit kannst du den aktuellen Lieferstatus jederzeit einsehen. Ablageorte stimmen wir nach Moeglichkeit mit dem Versanddienstleister ab.',
        },
        {
          title: 'Adressaenderung',
          body: 'Aenderungen an der Lieferadresse kannst du direkt nach der Bestellung per E-Mail an uns melden. Sobald die Ware unseren Logistikpartner verlassen hat, ist eine Adressaenderung leider nicht mehr moeglich.',
        },
        {
          title: 'Zoll und Einfuhr (Schweiz)',
          body: 'Lieferungen in die Schweiz koennen Zollgebuehren und Einfuhrabgaben unterliegen. Diese werden bei der Zustellung faellig und sind vom Empfaenger zu tragen.',
        },
      ]}
    />
  )
}
