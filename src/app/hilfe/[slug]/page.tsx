import { notFound } from 'next/navigation'

const PAGES: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  versand: {
    title: 'Versand & Lieferzeiten',
    sections: [
      {
        heading: 'Lieferzeiten',
        body: 'Unsere Produkte werden aus internationalen Lagern versendet. Die Lieferzeit beträgt in der Regel 7 bis 15 Werktage. Die voraussichtliche Lieferzeit wird auf jeder Produktseite angezeigt.',
      },
      {
        heading: 'Versandkosten',
        body: 'Ab einem Bestellwert von 49 Euro liefern wir versandkostenfrei. Darunter berechnen wir eine Versandpauschale von 4,99 Euro.',
      },
      {
        heading: 'Sendungsverfolgung',
        body: 'Sobald deine Bestellung versendet wurde, erhältst du eine E-Mail mit der Tracking-Nummer. Den Status kannst du jederzeit in deinem Konto unter "Meine Bestellungen" einsehen.',
      },
    ],
  },
  rueckgabe: {
    title: 'Rückgabe & Umtausch',
    sections: [
      {
        heading: '14 Tage Widerrufsrecht',
        body: 'Du kannst Artikel innerhalb von 14 Tagen nach Erhalt ohne Angabe von Gründen zurückgeben. Die Artikel müssen unbenutzt und in der Originalverpackung sein.',
      },
      {
        heading: 'So funktioniert die Rückgabe',
        body: 'Kontaktiere unseren Kundenservice mit deiner Bestellnummer. Wir senden dir alle Informationen für die Rücksendung zu. Nach Eingang und Prüfung der Ware erstatten wir den Kaufpreis innerhalb von 14 Tagen.',
      },
    ],
  },
  zahlung: {
    title: 'Zahlungsarten',
    sections: [
      {
        heading: 'Verfügbare Zahlungsmethoden',
        body: 'Wir akzeptieren Kreditkarte (Visa, Mastercard), PayPal, Apple Pay und Google Pay. Alle Zahlungen werden SSL-verschlüsselt und sicher über unseren Zahlungsdienstleister abgewickelt.',
      },
    ],
  },
  kontakt: {
    title: 'Kontakt',
    sections: [
      {
        heading: 'So erreichst du uns',
        body: 'Schreib uns jederzeit eine E-Mail an support@shopsin.delqhi.com. Wir antworten in der Regel innerhalb von 24 Stunden an Werktagen.',
      },
    ],
  },
}

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = PAGES[slug]
  return { title: page ? `${page.title} | SIN Shop` : 'Hilfe' }
}

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = PAGES[slug]
  if (!page) notFound()

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-balance">{page.title}</h1>
      <div className="flex flex-col gap-8">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  )
}
