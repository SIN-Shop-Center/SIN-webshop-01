import type { CustomerSegment, TrustSignal } from '@simone/contracts'
import { TrustPanel } from '@/features/trust'

type ProductTrustPanelProps = {
  segment: CustomerSegment
}

const PRODUCT_TRUST_CONTENT: Record<CustomerSegment, { title: string; signals: TrustSignal[] }> = {
  b2c: {
    title: 'Sicher kaufen',
    signals: [
      {
        id: 'product-returns',
        title: '30 Tage Rückgabe',
        description: 'Entspannt ausprobieren. Du kannst alle Artikel innerhalb von 30 Tagen zurücksenden.',
        icon: 'rotate',
        priority: 'primary',
        href: '/rueckgabe',
      },
      {
        id: 'product-costs',
        title: 'Transparente Gesamtkosten',
        description: 'Keine versteckten Gebühren. Volle Transparenz bei Versand und Steuern.',
        icon: 'receipt',
        priority: 'primary',
      },
      {
        id: 'product-contact',
        title: 'Kontakt in 24 Stunden',
        description: 'Unser Team ist bei Fragen jederzeit für dich da.',
        icon: 'support',
        priority: 'secondary',
        href: '/kontakt',
      },
    ],
  },
  b2b: {
    title: 'Planbar für Teams',
    signals: [
      {
        id: 'product-b2b-costs',
        title: 'Preis und Menge klar',
        description: 'Spezielle Firmenkonditionen und Mengenrabatte verfügbar.',
        icon: 'receipt',
        priority: 'primary',
      },
      {
        id: 'product-b2b-billing',
        title: 'Firmenangaben möglich',
        description: 'Bequemer Kauf auf Rechnung für verifizierte Unternehmenskunden.',
        icon: 'verified',
        priority: 'primary',
      },
      {
        id: 'product-b2b-contact',
        title: 'Kontakt in 24 Stunden',
        description: 'Dein persönlicher Ansprechpartner kümmert sich um dein Anliegen.',
        icon: 'support',
        priority: 'secondary',
        href: '/kontakt',
      },
    ],
  },
}

export function ProductTrustPanel({ segment }: ProductTrustPanelProps) {
  const content = PRODUCT_TRUST_CONTENT[segment]
  return (
    <TrustPanel
      title={content.title}
      signals={content.signals}
      compact
      className="bg-white"
    />
  )
}
