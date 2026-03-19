import type { Metadata } from 'next'
import { InfoPage } from '@/components/content/InfoPage'
import { buildPageMetadata } from '@/lib/page-metadata'
import { STOREFRONT_LEGAL_PAGES } from '@/lib/storefront-legal'

const PAGE = STOREFRONT_LEGAL_PAGES.agb

export const metadata: Metadata = buildPageMetadata({
  title: PAGE.title,
  description: PAGE.description,
  path: PAGE.path,
})

export default function AgbPage() {
  return (
    <InfoPage
      title={PAGE.title}
      intro={PAGE.intro}
      sections={PAGE.sections || []}
    />
  )
}
