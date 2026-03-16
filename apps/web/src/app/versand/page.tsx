import type { Metadata } from 'next'
import { Truck } from 'lucide-react'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Versand und Lieferung',
  description: 'Versandkosten, Lieferzeiten, Tracking und Lieferoptionen bei Simone Shop.',
  path: '/versand',
})

export default function VersandPage() {
  return (
    <InfoPage
      title="Versand & Lieferung"
      intro="Versandkosten, Lieferzeiten und Tracking sind vor dem Kauf sichtbar und im Checkout verständlich aufgeschlüsselt."
      tone="cool"
      heroIcon={<Truck className="h-5 w-5" />}
      highlights={[
        { label: 'Lieferzeit', value: '2-4 Werktage' },
        { label: 'Kostenfrei ab', value: '50 EUR Warenwert' },
        { label: 'Tracking', value: 'per E-Mail' },
      ]}
      eyebrow="Versand"
      sidebarEyebrow="Lieferstatus"
      sidebarTitle="Tracking & Adresse"
      sidebarIntro="Schneller Überblick zu Versand, Zustellung und Ablage."
      sidebarFootnote="Wir helfen bei Versand, Tracking und Adressänderungen."
      primaryCta={{ label: 'Tracking anfragen', href: '/kontakt' }}
      secondaryCta={{ label: 'Rückgabe ansehen', href: '/rueckgabe' }}
      sections={[
        {
          title: 'Kosten & Regionen',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Standardversand: 4,99 EUR</li>
              <li>Kostenfrei ab: 50 EUR Warenwert</li>
              <li>Liefergebiet: DACH</li>
            </ul>
          ),
        },
        {
          title: 'Lieferzeiten & Bearbeitung',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Standard: 2-4 Werktage nach Versandbestätigung.</li>
              <li>Bearbeitung: 1 Werktag, bei hoher Nachfrage bis zu 2 Werktage.</li>
            </ul>
          ),
        },
        {
          title: 'Cut-off & Änderungen',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Adressänderungen bitte so schnell wie möglich nach der Bestellung melden.</li>
              <li>Tracking kommt per E-Mail nach Versand.</li>
              <li>Zustellung: Optionen hängen vom Versanddienstleister ab (z.B. Ablageort).</li>
            </ul>
          ),
        },
        {
          title: 'Versandkosten & Freigrenze',
          body: 'Standardversand 4,99 EUR. Ab 50 EUR Warenwert erfolgt die Lieferung kostenfrei.',
        },
        {
          title: 'Tracking & Zustellung',
          body: 'Nach Versand erhältst du eine Tracking-Mail. So siehst du jederzeit den aktuellen Lieferstatus und kannst die Zustellung anpassen.',
        },
        {
          title: 'Liefergebiet & Adressänderung',
          body: 'Wir liefern in den DACH-Raum. Änderungen an der Lieferadresse kannst du direkt nach der Bestellung melden. Ablageorte stimmen wir nach Möglichkeit mit dem Versanddienstleister ab.',
        },
      ]}
    />
  )
}
