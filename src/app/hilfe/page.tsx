// Purpose: FAQ / Hilfe page with expandable Q&A accordion (Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hilfe & FAQ — ShopSIN',
  description: 'Antworten auf häufige Fragen zu Versand, Zahlung, Rückgabe und deinem Konto.',
}

const faqs = [
  {
    q: 'Wie lange dauert der Versand?',
    a: 'Die Lieferung erfolgt innerhalb von 7–15 Werktagen innerhalb Deutschlands. Ab 49 € Bestellwert ist der Versand kostenlos, darunter berechnen wir 4,99 €.',
  },
  {
    q: 'Welche Zahlungsmethoden gibt es?',
    a: 'Die Zahlung läuft sicher über Stripe. Dort stehen dir u.a. Kreditkarte und weitere Methoden zur Verfügung.',
  },
  {
    q: 'Kann ich meine Bestellung zurückgeben?',
    a: 'Ja, du hast ein 14-tägiges Widerrufsrecht gemäß Fernabsatzgesetz. Details findest du auf unserer Widerrufsseite.',
  },
  {
    q: 'Wo sehe ich meine Bestellungen?',
    a: 'Melde dich an und öffne „Meine Bestellungen" im Menü oben rechts.',
  },
  {
    q: 'Ich habe mein Passwort vergessen — was nun?',
    a: 'Nutze die Funktion „Passwort vergessen" auf der Anmeldeseite, um per E-Mail ein neues Passwort festzulegen.',
  },
  {
    q: 'Wie erreiche ich den Support?',
    a: 'Schreib uns über das Kontaktformular oder direkt an opensin@gmx.com — wir melden uns schnellstmöglich.',
  },
]

export default function HilfePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
        Hilfe &amp; FAQ
      </h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Antworten auf die häufigsten Fragen. Nicht fündig geworden?{' '}
        <Link href="/kontakt" className="underline underline-offset-4 hover:text-foreground">
          Kontaktiere uns
        </Link>
        .
      </p>
      <div className="flex flex-col gap-3">
        {faqs.map((faq) => (
          <details key={faq.q} className="group rounded-lg border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold marker:hidden">{faq.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
