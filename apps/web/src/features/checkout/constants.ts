import { Check, CreditCard, Truck } from 'lucide-react'
import type { PaymentMethod, StepConfig } from './types'

export const FREE_SHIPPING_THRESHOLD = 50
export const STANDARD_SHIPPING_COST = 4.99

export const CHECKOUT_STEPS: StepConfig[] = [
  { id: 'shipping', label: 'Lieferung', icon: Truck },
  { id: 'payment', label: 'Zahlung', icon: CreditCard },
  { id: 'review', label: 'Prüfung', icon: Check },
]

export const PAYMENT_METHODS: Array<{
  id: PaymentMethod
  label: string
  info: string
}> = [
  { id: 'card', label: 'Karte oder Link', info: 'Visa, Mastercard, AMEX oder gespeicherte Link-Zahlung' },
]
