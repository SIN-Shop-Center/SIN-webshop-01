import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ',
  description: 'Die wichtigsten Antworten zu Bestellung, Lieferung, Rückgabe, Zahlung und Firmenkauf.',
  path: '/faq',
})

export default function FaqPage() {
  return (
    <InfoPage
      title="Häufige Fragen"
      intro="Die wichtigsten Antworten zu Bestellung, Lieferung, Rückgabe, Zahlung und Firmenkauf."
      sections={[
        {
          title: 'Wann wird versendet?',
          body: 'Verfügbare Artikel werden in der Regel innerhalb von 24-48 Stunden versandt. Den aktuellen Hinweis zur Lieferzeit siehst du bereits im Sortiment und auf der Produktseite.',
        },
        {
          title: 'Kann ich als Unternehmen bestellen?',
          body: 'Ja. Im Checkout stehen optionale Felder für Firma, USt-IdNr. und Bestellreferenz bereit, damit Bestellungen sauber zugeordnet werden können.',
        },
        {
          title: 'Wie funktioniert die Rückgabe?',
          body: 'Rückgaben sind innerhalb von 30 Tagen möglich. Ablauf und Bedingungen findest du auf der Rückgabeseite, bevor du bestellst.',
        },
        {
          title: 'Wann sehe ich Versand- und Gesamtkosten?',
          body: 'Versand- und Gesamtkosten werden vor dem letzten Bestellschritt sichtbar angezeigt. Es gibt keine versteckten Zusatzkosten nach der Produktauswahl.',
        },
        {
          title: 'Wie erreiche ich euch bei Rückfragen?',
          body: 'Über die Kontaktseite erreichst du uns direkt zu Produkten, Bestellungen, Lieferung oder Firmenkauf. Die Antwort erfolgt in der Regel innerhalb von 24 Stunden.',
        },
      ]}
    />
  )
}
