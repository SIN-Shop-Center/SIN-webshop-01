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
        description: 'Rückgabe und Ablauf bleiben direkt am Produkt sichtbar.',
        icon: 'rotate',
        priority: 'primary',
        href: '/rueckgabe',
      },
      {
        id: 'product-costs',
        title: 'Transparente Gesamtkosten',
        description: 'MwSt., Versand und nächste Schritte vor dem Kauf sichtbar.',
        icon: 'receipt',
        priority: 'primary',
      },
      {
        id: 'product-contact',
        title: 'Kontakt in 24 Stunden',
        description: 'Fragen zum Produkt oder zur Bestellung schnell klären.',
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
        description: 'Verfügbarkeit und Gesamtkosten bleiben vor dem letzten Schritt sichtbar.',
        icon: 'receipt',
        priority: 'primary',
      },
      {
        id: 'product-b2b-billing',
        title: 'Firmenangaben möglich',
        description: 'USt-IdNr. und Bestellreferenz direkt im Checkout erfassen.',
        icon: 'verified',
        priority: 'primary',
      },
      {
        id: 'product-b2b-contact',
        title: 'Kontakt in 24 Stunden',
        description: 'Rückfragen zu Bestellung, Lieferung oder Beschaffung schnell klären.',
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
