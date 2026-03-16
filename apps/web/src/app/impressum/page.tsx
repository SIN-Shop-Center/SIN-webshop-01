import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { getLegalProfile } from '@/lib/legal-profile'
import { buildPageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Impressum',
  description: 'Anbieterkennzeichnung, Kontakt und steuerliche Pflichtangaben für Simone Shop.',
  path: '/impressum',
})

export default function ImpressumPage() {
  const profile = getLegalProfile()

  return (
    <InfoPage
      title="Impressum"
      intro="Pflichtangaben gemäß § 5 TMG. Diese Seite wird vor der Freischaltung mit den finalen Anbieter- und Kontaktdaten vervollständigt."
      sections={[
        {
          title: 'Anbieter',
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
            'Firmierung und ladungsfähige Anschrift werden vor der Freischaltung final ergänzt.'
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
            'Steuer- und USt-Angaben werden vor der Freischaltung final ergänzt.'
          ),
        },
      ]}
    />
  )
}
