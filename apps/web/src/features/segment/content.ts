import type { CustomerSegment } from '@simone/contracts'

type SegmentCopy = {
  heroKicker: string
  heroTitle: string
  heroSubtitle: string
  primaryCta: string
  secondaryCta: string
  productHint: string
  trustFocus: string[]
}

export const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  b2c: 'Für Privatkunden',
  b2b: 'Für Unternehmen',
}

export const SEGMENT_COPY: Record<CustomerSegment, SegmentCopy> = {
  b2c: {
    heroKicker: 'Schnell entscheiden, sicher kaufen',
    heroTitle: 'Produkte, die im Alltag sofort spürbar helfen.',
    heroSubtitle: 'Klare Preise, schnelle Lieferung, einfache Retoure in einem transparenten Checkout.',
    primaryCta: 'Produkte entdecken',
    secondaryCta: 'Lieferung & Rückgabe',
    productHint: 'Inkl. MwSt. und transparente Gesamtkosten',
    trustFocus: ['30 Tage Rückgabe', 'Versand in 24-48h', 'Verifizierte Bewertungen'],
  },
  b2b: {
    heroKicker: 'Zuverlässig beschaffen statt improvisieren',
    heroTitle: 'B2B-Bestellung mit klaren Prozessen und Planbarkeit.',
    heroSubtitle: 'Mit Firmenangaben, USt-IdNr. und klarer Lieferfähigkeit für wiederkehrende Bestellungen.',
    primaryCta: 'B2B-Angebot starten',
    secondaryCta: 'Lieferfähigkeit prüfen',
    productHint: 'Firmenangaben, Bestellreferenz und klare Beschaffungsschritte',
    trustFocus: ['Rechnung & USt-IdNr.', 'Verfügbarkeit transparent', 'Wiederbestellung mit Referenz'],
  },
}
