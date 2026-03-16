import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Über Simone Shop',
  description: 'Wofür Simone Shop gebaut ist und wie Produkt, Preis, Lieferung und Rückgabe bewusst erklärt werden.',
  path: '/about',
})

export default function AboutPage() {
  return (
    <InfoPage
      title="Über Simone Shop"
      intro="Simone Shop ist auf ein einfaches Ziel ausgerichtet: Produkte schnell erfassbar machen und Bestellungen ohne Umwege zum Abschluss bringen."
      sections={[
        {
          title: 'Wofür der Shop gebaut ist',
          body: 'Produkt, Preis, Lieferung und Rückgabe sollen früh sichtbar sein. Nutzer müssen nicht erst den Checkout öffnen, um die wichtigen Fakten zu verstehen.',
        },
        {
          title: 'Wie wir verkaufen',
          body: 'Weniger Oberflächenlärm, mehr Orientierung. Listing, Produktseite, Warenkorb und Checkout führen mit klaren nächsten Schritten weiter.',
        },
        {
          title: 'Privat und Firmen',
          body: 'Der Shop trennt sauber zwischen Privatkauf und Firmenkauf, damit beide Zielgruppen die jeweils relevanten Angaben, Prozesse und Hinweise sehen.',
        },
      ]}
    />
  )
}
