import type { Metadata } from 'next'
import { RotateCcw } from 'lucide-react'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Rückgabe & Erstattung',
  description: 'Rückgabe, Fristen, Zustand der Ware und Erstattung bei Simone Shop.',
  path: '/rueckgabe',
})

export default function RückgabePage() {
  return (
    <InfoPage
      title="Rückgabe & Erstattung"
      intro="Rückgabe und Erstattung sind vor dem Kauf klar und nach der Bestellung ohne Umwege erreichbar."
      tone="accent"
      heroIcon={<RotateCcw className="h-5 w-5" />}
      highlights={[
        { label: 'Frist', value: '30 Tage Rückgabe' },
        { label: 'Erstattung', value: '3-5 Werktage' },
        { label: 'Status', value: 'Update in 24 Stunden' },
      ]}
      eyebrow="Rückgabe"
      sidebarEyebrow="Rückgabe-Check"
      sidebarTitle="Rückgabe & Status"
      sidebarIntro="Kurzer Weg für Rückgabe, Umtausch und Erstattung."
      sidebarFootnote="Wir helfen bei Rückgabe, Umtausch und Erstattung ohne Ping-Pong."
      primaryCta={{ label: 'Rückgabe starten', href: '/kontakt' }}
      secondaryCta={{ label: 'Versandinfo ansehen', href: '/versand' }}
      sections={[
        {
          title: 'Rückgabe-Check (kurz)',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Frist: innerhalb von 30 Tagen ab Zustellung.</li>
              <li>Zustand: vollständig und möglichst in Originalverpackung.</li>
              <li>Reklamation: defekt oder falsch geliefert? Erst melden, dann klären wir den Rückweg.</li>
              <li>Unsicher? Ein Satz über Kontakt reicht, wir sagen dir sofort, ob es passt.</li>
            </ul>
          ),
        },
        {
          title: 'Rückgabe in 3 Schritten',
          body: (
            <ol className="list-decimal space-y-1 pl-4">
              <li>Rückgabe kurz per Kontakt ankündigen.</li>
              <li>Artikel sicher verpacken und versenden.</li>
              <li>Nach Prüfung erfolgt die Erstattung automatisch.</li>
            </ol>
          ),
        },
        {
          title: 'Status-Timeline',
          body: (
            <ul className="list-disc space-y-1 pl-4">
              <li>Ankündigung: Wir bestätigen innerhalb von 24 Stunden.</li>
              <li>Rücksendung: Du erhältst die Schritte und den passenden Rückweg.</li>
              <li>Eingang & Prüfung: Artikel wird geprüft und zugeordnet.</li>
              <li>Erstattung: in der Regel 3-5 Werktage nach Abschluss der Prüfung.</li>
            </ul>
          ),
        },
        {
          title: 'Frist & Zustand',
          body: 'Artikel können innerhalb von 30 Tagen nach Erhalt zurückgegeben werden. Bitte nach Möglichkeit in Originalverpackung und vollständig.',
        },
        {
          title: 'Rücksendekosten',
          body: 'Bei berechtigter Reklamation übernehmen wir die Rücksendekosten. Für reguläre Rückgaben teilen wir dir den günstigsten Rückweg direkt mit.',
        },
        {
          title: 'Erstattung & Umtausch',
          body: 'Die Rückzahlung erfolgt in der Regel über dieselbe Zahlungsart wie bei der Bestellung. Nach Eingang und Prüfung planen wir 3-5 Werktage ein.',
        },
        {
          title: 'Ausschlüsse',
          body: 'Personalisierte oder geöffnete Hygieneartikel sind vom Umtausch ausgeschlossen. Falls du unsicher bist, klären wir das vorab.',
        },
      ]}
    />
  )
}
