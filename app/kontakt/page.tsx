// Purpose: Contact page with form + legal links (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import Link from 'next/link'
import { ContactForm } from './ContactForm'
import { STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Kontaktiere ShopSIN — wir antworten innerhalb von 24 Stunden.',
}

export default function KontaktPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-balance md:text-4xl">
        Kontakt
      </h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Du hast eine Frage zu einer Bestellung, einem Produkt oder möchtest
        Feedback geben? Schreib uns — wir antworten innerhalb von 24 Stunden
        (werktags).
      </p>

      <ContactForm />

      <p className="mt-8 text-sm text-muted-foreground">
        Bevor du schreibst, lohnt sich ein Blick in unsere{' '}
        <Link href="/agb" className="text-primary underline">
          AGB
        </Link>
        , die{' '}
        <Link href="/widerrufsrecht" className="text-primary underline">
          Widerrufsbelehrung
        </Link>{' '}
        oder die{' '}
        <Link href="/versand" className="text-primary underline">
          Versandinformationen
        </Link>
        .
      </p>

      <nav
        aria-label="Rechtliche Hinweise"
        className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-sm"
      >
        {STOREFRONT_LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-muted-foreground underline hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
