import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { getLegalProfile } from '@/lib/legal-profile'
import { buildPageMetadata } from '@/lib/page-metadata'
import { STOREFRONT_LEGAL_PAGES } from '@/lib/storefront-legal'

const IMPRESSUM_PAGE = STOREFRONT_LEGAL_PAGES.impressum

export const metadata: Metadata = buildPageMetadata({
  title: IMPRESSUM_PAGE.title,
  description: IMPRESSUM_PAGE.description,
  path: IMPRESSUM_PAGE.path,
})

export default function ImpressumPage() {
  const profile = getLegalProfile()

  return (
    <InfoPage
      title={IMPRESSUM_PAGE.title}
      intro={IMPRESSUM_PAGE.intro}
      sections={[
        {
          title: 'Angaben gemaess § 5 TMG',
          body: profile.hasConfiguredImpressum ? (
            <>
              {profile.companyName}
              <br />
              {profile.addressLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </>
          ) : (
            'Firmierung und ladungsfaehige Anschrift werden vor der Freischaltung final ergaenzt.'
          ),
        },
        {
          title: 'Kontakt',
          body: (
            <>
              E-Mail: {profile.legalEmail}
              {profile.legalPhone ? (
                <>
                  <br />
                  Telefon: {profile.legalPhone}
                </>
              ) : null}
            </>
          ),
        },
        {
          title: 'Steuerangaben',
          body: profile.taxId || profile.vatId ? (
            <>
              {profile.taxId ? <>Steuernummer: {profile.taxId}<br /></> : null}
              {profile.vatId ? <>USt-IdNr.: {profile.vatId}</> : null}
            </>
          ) : (
            'Kleinunternehmerregelung gemaess § 19 UStG. Umsatzsteuer wird daher nicht ausgewiesen.'
          ),
        },
        {
          title: 'Verantwortlich fuer den Inhalt nach § 55 Abs. 2 RStV',
          body: (
            <>
              {profile.companyName}
              <br />
              {profile.addressLines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </>
          ),
        },
        {
          title: 'Streitschlichtung',
          body: 'Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Wir sind nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        },
        {
          title: 'Haftung fuer Inhalte',
          body: 'Als Diensteanbieter sind wir gemaess § 7 Abs.1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu ueberwachen oder nach Umstaenden zu forschen, die auf eine rechtswidrige Taetigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt. Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung moeglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.',
        },
        {
          title: 'Haftung fuer Links',
          body: 'Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf moegliche Rechtsverstoesse ueberprueft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.',
        },
        {
          title: 'Urheberrecht',
          body: 'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Solltest du auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.',
        },
      ]}
    />
  )
}
