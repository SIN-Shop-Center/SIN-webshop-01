// Purpose: AGB page
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { STOREFRONT_LEGAL_PAGES } from '../../config/storefront-legal'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen für Bestellungen bei ShopSIN.',
}

export default function AGBPage() {
  return <LegalPage page={STOREFRONT_LEGAL_PAGES.agb} />
}
