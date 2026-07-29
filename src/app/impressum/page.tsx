// Purpose: Impressum page
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { STOREFRONT_LEGAL_PAGES } from '../../config/storefront-legal'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Anbieterkennzeichnung gemäß § 5 TMG für ShopSIN.',
}

export default function ImpressumPage() {
  return <LegalPage page={STOREFRONT_LEGAL_PAGES.impressum} />
}
