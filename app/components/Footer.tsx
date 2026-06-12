// Purpose: Footer with brand, shop links, newsletter, legal links
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { NewsletterSignup } from '@/components/newsletter-signup'

const SHOP_LINKS = [
  { href: '/produkte', label: 'Alle Produkte' },
  { href: '/sale', label: 'Sale' },
  { href: '/wunschliste', label: 'Wunschliste' },
  { href: '/konto/bestellungen', label: 'Meine Bestellungen' },
]

const SERVICE_LINKS = [
  { href: '/hilfe/versand', label: 'Versand & Lieferzeiten' },
  { href: '/hilfe/rueckgabe', label: 'Rückgabe & Umtausch' },
  { href: '/hilfe/zahlung', label: 'Zahlungsarten' },
  { href: '/hilfe/kontakt', label: 'Kontakt' },
]

const LEGAL_LINKS = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/agb', label: 'AGB' },
  { href: '/widerrufsrecht', label: 'Widerrufsbelehrung' },
  { href: '/datenschutz', label: 'Datenschutz' },
]

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-muted">
      <div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold">SIN Shop</h3>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            Dein Online-Shop für Mode, Haushalt, Elektronik und mehr &ndash; mit
            Käuferschutz und 14 Tagen Widerrufsrecht.
          </p>
        </div>

        <nav aria-label="Shop">
          <h3 className="mb-3 text-sm font-semibold">Shop</h3>
          <ul className="flex flex-col gap-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Kundenservice">
          <h3 className="mb-3 text-sm font-semibold">Kundenservice</h3>
          <ul className="flex flex-col gap-2">
            {SERVICE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Newsletter</h3>
          <p className="text-sm text-muted-foreground">
            Angebote und Neuheiten direkt ins Postfach.
          </p>
          <NewsletterSignup />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row">
          <nav aria-label="Rechtliches">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SIN Shop &middot; Jeremy Schulze &middot;
            Kurf&uuml;rstenstra&szlig;e 124, 10785 Berlin
          </p>
        </div>
      </div>
    </footer>
  )
}
