import type { TrustSignal } from '@simone/contracts'

export const PRIMARY_TRUST_SIGNALS: TrustSignal[] = [
  {
    id: 'delivery-fast',
    title: 'Schneller Versand',
    description: 'Versand in 24-48 Stunden bei verfügbaren Artikeln',
    icon: 'truck',
    priority: 'primary',
    href: '/versand',
  },
  {
    id: 'returns',
    title: '30 Tage Rückgabe',
    description: 'Ohne versteckte Gebühren oder Hürden',
    icon: 'rotate',
    priority: 'primary',
    href: '/rueckgabe',
  },
  {
    id: 'payments',
    title: 'Sichere Zahlung',
    description: 'SSL-verschlüsselt mit etablierten Anbietern',
    icon: 'shield',
    priority: 'primary',
  },
]

export const CHECKOUT_TRUST_SIGNALS: TrustSignal[] = [
  {
    id: 'costs-transparent',
    title: 'Transparente Gesamtkosten',
    description: 'Keine Überraschungen im letzten Checkout-Schritt',
    icon: 'receipt',
    priority: 'primary',
  },
  {
    id: 'support-fast',
    title: 'Kontakt in 24 Stunden',
    description: 'Antwort in der Regel innerhalb von 24 Stunden',
    icon: 'support',
    priority: 'secondary',
    href: '/kontakt',
  },
]
