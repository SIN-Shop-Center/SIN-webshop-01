// Purpose: Datenschutz page
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { STOREFRONT_LEGAL_PAGES } from '../../config/storefront-legal'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description:
    'Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO bei ShopSIN.',
}

export default function DatenschutzPage() {
  return <LegalPage page={STOREFRONT_LEGAL_PAGES.datenschutz} />
}
