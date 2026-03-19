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
            'Derzeit sind keine Steuer- oder USt-Angaben hinterlegt.'
          ),
        },
      ]}
    />
  )
}
