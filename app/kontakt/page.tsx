// Purpose: Contact form page — public (§ 5 DDG second contact channel)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)
//
// Server component that renders the form. The form is a client component
// for instant feedback (no page reload).

import { STOREFRONT_LEGAL_LINKS } from '../../config/storefront-legal'
import { ContactForm } from './ContactForm'
import Link from 'next/link'

export default function KontaktPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-4 text-3xl font-bold">Kontakt</h1>
      <p className="mb-8 text-pretty text-muted-foreground">
        Du hast eine Frage zu einer Bestellung, einem Produkt oder möchtest
        Feedback geben? Schreib uns — wir antworten innerhalb von 24 Stunden
        (werktags).
      </p>

      <ContactForm />

      <p className="mt-8 text-sm text-muted-foreground">
        Bevor du schreibst, lohnt sich ein Blick in unsere{' '}
        <Link href="/agb" className="text-primary underline">AGB</Link>, die{' '}
        <Link href="/widerrufsrecht" className="text-primary underline">Widerrufsbelehrung</Link>{' '}
        oder die{' '}
        <Link href="/versand" className="text-primary underline">Versandinformationen</Link>.
      </p>

      <nav className="mt-8 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STOREFRONT_LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
