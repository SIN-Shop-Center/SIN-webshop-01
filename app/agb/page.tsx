// Purpose: AGB page (Step 5 — real content from config/storefront-legal)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

import { LegalPage } from '@/components/LegalPage'
import { STOREFRONT_LEGAL_PAGES } from '../../config/storefront-legal'

export default function AGBPage() {
  return <LegalPage page={STOREFRONT_LEGAL_PAGES.agb} />
}
