import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Datenschutz',
  description: 'Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO bei Simone Shop.',
  path: '/datenschutz',
})

export default function DatenschutzPage() {
  return (
    <InfoPage
      title="Datenschutz"
      intro="Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO."
      sections={[
        {
          title: 'Verarbeitungszwecke',
          body: 'Wir verarbeiten Daten zur Bestellabwicklung, Kundenkommunikation und Serviceverbesserung.',
        },
        {
          title: 'Rechtsgrundlagen',
          body: 'Die Verarbeitung erfolgt auf Basis von Vertragserfüllung, rechtlicher Verpflichtung oder Einwilligung.',
        },
        {
          title: 'Betroffenenrechte',
          body: 'Du kannst Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung verlangen.',
        },
      ]}
    />
  )
}
