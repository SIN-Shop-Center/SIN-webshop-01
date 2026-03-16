import { PackageCheck, Repeat2, Truck } from 'lucide-react'
import type { PaymentState } from './useCheckoutSuccessState'

export const CHECKOUT_SUCCESS_CONTENT: Record<PaymentState, { heading: string; description: string }> = {
  loading: {
    heading: 'Zahlung wird geprüft',
    description: 'Wir gleichen den Zahlungsstatus gerade ab und aktualisieren danach sofort deine Bestellung.',
  },
  paid: {
    heading: 'Bestellung erfolgreich eingegangen',
    description: 'Dein Auftrag ist erfasst. Wir informieren dich per E-Mail über Prüfung, Versand und Zustellung.',
  },
  pending: {
    heading: 'Zahlung wird noch bestätigt',
    description: 'Die Bestellung ist angelegt, die Rückmeldung des Zahlungsanbieters steht noch aus.',
  },
  failed: {
    heading: 'Zahlung fehlgeschlagen',
    description: 'Die Zahlung konnte nicht bestätigt werden. Du kannst die Zahlung direkt erneut starten.',
  },
  error: {
    heading: 'Status aktuell nicht verfügbar',
    description: 'Bitte aktualisiere diese Seite oder kontaktiere uns mit deiner Bestellnummer.',
  },
}

export const CHECKOUT_SUCCESS_STEPS = [
  {
    icon: PackageCheck,
    title: 'Bestellung eingegangen',
    description: 'Wir haben deinen Auftrag erfasst und bereiten die nächsten Schritte vor.',
  },
  {
    icon: Truck,
    title: 'Versandupdate folgt',
    description: 'Sobald der Versand startet, erhältst du dein Tracking-Update per E-Mail.',
  },
  {
    icon: Repeat2,
    title: 'Einfach wieder bestellen',
    description: 'Im Konto bleiben deine Positionen für eine spätere Wiederbestellung griffbereit.',
  },
] as const
