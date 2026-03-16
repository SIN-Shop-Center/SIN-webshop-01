import Link from '@/components/ui/Link'
import { BadgeCheck, Building2, Clock3, Mail, ShieldCheck } from 'lucide-react'
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/public-contact'

const FOOTER_GROUPS = [
  {
    title: 'Sortiment',
    links: [
      { label: 'Alle Produkte', href: '/products' },
      { label: 'Privatkunden', href: '/products?segment=b2c' },
      { label: 'Firmenkauf', href: '/products?segment=b2b' },
      { label: 'Warenkorb', href: '/cart' },
    ],
  },
  {
    title: 'Service',
    links: [
      { label: 'Kundencenter', href: '/kundencenter' },
      { label: 'Kontakt', href: '/kontakt' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Versand', href: '/versand' },
      { label: 'Rückgabe', href: '/rueckgabe' },
      { label: 'Über uns', href: '/about' },
    ],
  },
  {
    title: 'Rechtliches',
    links: [
      { label: 'Impressum', href: '/impressum' },
      { label: 'Datenschutz', href: '/datenschutz' },
      { label: 'AGB', href: '/agb' },
      { label: 'Widerruf', href: '/widerrufsrecht' },
    ],
  },
]

const TRUST_FACTS = [
  { icon: ShieldCheck, text: 'Sichere Zahlung' },
  { icon: Clock3, text: 'Lieferung 24-48h' },
  { icon: BadgeCheck, text: 'Gesamtkosten vorab sichtbar' },
]

const SERVICE_SIGNALS = [
  { icon: Mail, title: 'Kontakt', text: PUBLIC_SUPPORT_EMAIL },
  { icon: Clock3, title: 'Antwortzeit', text: 'in der Regel innerhalb von 24 Stunden' },
  { icon: Building2, title: 'Firmenkauf', text: 'USt-IdNr., Firmenangaben und Bestellreferenz möglich' },
]

export function Footer() {
  return (
    <footer className="mt-20 border-t border-brand-border bg-brand-surface">
      <div className="shell-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.65fr_0.65fr_0.65fr]">
          <section>
            <Link href="/" prefetch={false} className="inline-flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-sm font-semibold text-white">
                SS
              </span>
              <span className="leading-none">
                <span className="block text-lg font-semibold tracking-tight text-brand-text">Simone Shop</span>
                <span className="block text-[0.66rem] uppercase tracking-[0.18em] text-brand-text-muted">
                  Preis. Lieferung. Klarheit.
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-lg text-sm leading-7 text-brand-text-muted">
              Produkte schnell verstehen, sauber vergleichen und ohne Umwege bestellen. Für Privatkunden
              und Firmen mit klaren nächsten Schritten.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {TRUST_FACTS.map((fact) => (
                <p
                  key={fact.text}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-1.5 text-xs font-semibold text-brand-text"
                >
                  <fact.icon className="h-4 w-4 text-brand-text" />
                  <span>{fact.text}</span>
                </p>
              ))}
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {SERVICE_SIGNALS.map((signal) => (
                <div key={signal.title} className="rounded-2xl border border-brand-border bg-white px-4 py-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-brand-text">
                    <signal.icon className="h-4 w-4 text-brand-text" />
                    {signal.title}
                  </p>
                  <p className="mt-1 text-brand-text-muted">{signal.text}</p>
                </div>
              ))}
            </div>
          </section>

          {FOOTER_GROUPS.map((group) => (
            <section key={group.title}>
              <p className="section-eyebrow text-brand-text">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center text-sm text-brand-text-muted transition-colors hover:text-brand-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-brand-border pt-6 text-sm text-brand-text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 Simone Shop. Alle Rechte vorbehalten.</p>
          <p>Preise in EUR. Versand im DACH-Raum. Lieferung, Rückgabe und Kontakt klar dokumentiert.</p>
        </div>
      </div>
    </footer>
  )
}
