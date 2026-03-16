import type { Metadata } from 'next'
import { LifeBuoy } from 'lucide-react'
import { InfoPage } from '@/components/content/InfoPage'
import { getLegalProfile } from '@/lib/legal-profile'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Kontakt & Hilfe',
  description: 'Direkter Kontakt zu Produkten, Bestellungen, Lieferung, Rückgabe und Firmenkauf.',
  path: '/kontakt',
})

function buildMailto(email: string, subject: string, body: string) {
  const params = new URLSearchParams()
  params.set('subject', subject)
  params.set('body', body)
  return `mailto:${email}?${params.toString()}`
}

export default function KontaktPage() {
  const profile = getLegalProfile()
  const contactChannels = profile.legalPhone ? 'E-Mail & Telefon' : 'E-Mail Support'
  const supportEmail = profile.supportEmail
  const baseTemplate = `Bestellnummer (falls vorhanden):\nName:\nWorum geht es genau?\n\nOptional:\nArtikel / Produktname:\nFotos / Links:\n`

  return (
    <InfoPage
      title="Kontakt & Hilfe"
      intro="Direkter Kontakt zu Produkten, Bestellungen, Lieferung, Rückgabe und Firmenkauf."
      tone="warm"
      heroIcon={<LifeBuoy className="h-5 w-5" />}
      highlights={[
        { label: 'Antwort', value: 'in 24 Stunden' },
        { label: 'Kontakt', value: contactChannels },
        { label: 'B2B', value: 'Mengen & Beschaffung' },
      ]}
      eyebrow="Kontakt"
      sidebarEyebrow="Support"
      sidebarTitle="Direkter Draht"
      sidebarIntro="Ein Kontaktweg für Bestellungen, Rückgaben und Firmenkauf."
      sidebarFootnote="Antworten zu Produkten, Bestellungen, Rückgabe und Firmenkauf."
      primaryCta={{
        label: 'E-Mail schreiben',
        href: buildMailto(supportEmail, 'Support-Anfrage (Simone Shop)', baseTemplate),
      }}
      secondaryCta={{ label: 'FAQ ansehen', href: '/faq' }}
      sections={[
        {
          title: "Worum geht's?",
          body: (
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: 'Bestellung & Status',
                  body: 'Änderung, Storno, Lieferstatus oder Rechnungsfragen.',
                  subject: 'Bestellung: Status / Änderung',
                },
                {
                  title: 'Lieferung & Tracking',
                  body: 'Tracking fehlt, Adresse ändern, Zustellproblem.',
                  subject: 'Lieferung: Tracking / Adresse',
                },
                {
                  title: 'Rückgabe & Reklamation',
                  body: 'Retoure, Umtausch, Defekt oder falscher Artikel.',
                  subject: 'Rückgabe: Retoure / Reklamation',
                },
                {
                  title: 'Firmenkauf (B2B)',
                  body: 'Mengen, Beschaffung, Angebot oder Rechnungskauf.',
                  subject: 'B2B: Anfrage',
                  email: profile.b2bEmail || supportEmail,
                },
              ].map((item) => {
                const email = item.email || supportEmail
                return (
                  <a
                    key={item.title}
                    href={buildMailto(email, item.subject, baseTemplate)}
                    className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-4 shadow-[0_8px_20px_rgba(18,18,18,0.04)] transition-colors hover:bg-white"
                  >
                    <p className="text-sm font-semibold text-brand-text">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-brand-text-muted">{item.body}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-text-muted">
                      E-Mail öffnen
                    </p>
                  </a>
                )
              })}
            </div>
          ),
        },
        {
          title: 'Support',
          body: (
            <>
              E-Mail: {supportEmail}
              {profile.legalPhone ? (
                <>
                  <br />
                  Telefon: {profile.legalPhone}
                </>
              ) : null}
              <br />
              Rückmeldung in der Regel innerhalb von 24 Stunden.
            </>
          ),
        },
        {
          title: 'Firmenkauf',
          body: `Für Mengenabsprachen, Beschaffung und Rückfragen zu Firmenbestellungen: ${profile.b2bEmail}`,
        },
        {
          title: 'Bestellung, Lieferung & Rechnung',
          body: 'Produktfragen, Lieferstatus, Rückgabe und Rechnungsfragen werden über denselben Kontaktweg schnell weitergeleitet.',
        },
        {
          title: 'Rückgabe & Reklamation',
          body: 'Wenn etwas nicht passt, helfen wir bei Rückgabe oder Ersatz. Kurze Nachricht reicht. Details zur Rückgabe findest du auch auf der Rückgabeseite.',
        },
      ]}
    />
  )
}
