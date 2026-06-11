// Purpose: Widerrufsrecht page
// Docs: PLAN-VERKAUFSFAEHIG.md

import type { Metadata } from 'next'
import { LegalPage } from '@/components/LegalPage'
import { STOREFRONT_LEGAL_PAGES } from '../../config/storefront-legal'

export const metadata: Metadata = {
  title: 'Widerrufsrecht',
  description: 'Gesetzliches Widerrufsrecht für Verbraucher bei ShopSIN.',
}

export default function WiderrufsrechtPage() {
  return (
    <LegalPage page={STOREFRONT_LEGAL_PAGES.widerrufsrecht} />
  )
}
