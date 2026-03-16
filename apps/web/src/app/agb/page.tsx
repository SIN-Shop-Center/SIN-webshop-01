import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen für Bestellungen bei Simone Shop.',
  path: '/agb',
})

export default function AgbPage() {
  return (
    <InfoPage
      title="AGB"
      intro="Allgemeine Geschäftsbedingungen für Bestellungen bei Simone Shop."
      sections={[
        {
          title: 'Geltungsbereich',
          body: 'Diese Bedingungen gelten für alle Bestellungen über unseren Online-Shop.',
        },
        {
          title: 'Vertragsschluss',
          body: 'Der Vertrag kommt durch Annahme deiner Bestellung durch uns zustande.',
        },
        {
          title: 'Preise und Zahlung',
          body: 'Alle Preise werden transparent im Checkout dargestellt. Versteckte Gebühren gibt es nicht.',
        },
      ]}
    />
  )
}
