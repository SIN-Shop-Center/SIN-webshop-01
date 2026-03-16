import type { CartItem } from '@/types'
import { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST } from './constants'
import type { CheckoutSessionPayload, ShippingData } from './types'

const CHECKOUT_SHIPPING_DRAFT_KEY = 'simone:checkout:shipping-draft:v1'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ZIP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s-]{2,11}$/

export type ShippingFieldErrors = Partial<Record<keyof ShippingData, string>>

export function createDefaultShippingData(): ShippingData {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    zip: '',
    country: 'Deutschland',
    companyName: '',
    vatId: '',
    purchaseOrderRef: '',
  }
}

export function getShippingCost(total: number): number {
  return total >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeShippingData(raw: unknown): ShippingData | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = raw as Record<string, unknown>
  const normalized: ShippingData = {
    firstName: asString(source.firstName),
    lastName: asString(source.lastName),
    email: asString(source.email),
    phone: asString(source.phone),
    street: asString(source.street),
    city: asString(source.city),
    zip: asString(source.zip),
    country: asString(source.country) || 'Deutschland',
    companyName: asString(source.companyName),
    vatId: asString(source.vatId),
    purchaseOrderRef: asString(source.purchaseOrderRef),
  }

  const hasUserInput =
    normalized.firstName.trim().length > 0 ||
    normalized.lastName.trim().length > 0 ||
    normalized.email.trim().length > 0 ||
    normalized.phone.trim().length > 0 ||
    normalized.street.trim().length > 0 ||
    normalized.city.trim().length > 0 ||
    normalized.zip.trim().length > 0 ||
    normalized.companyName.trim().length > 0 ||
    normalized.vatId.trim().length > 0 ||
    normalized.purchaseOrderRef.trim().length > 0

  const hasCustomCountry = normalized.country.trim().toLowerCase() !== 'deutschland'
  return hasUserInput || hasCustomCountry ? normalized : null
}

export function readCheckoutShippingDraft(): ShippingData | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SHIPPING_DRAFT_KEY)
    if (!raw) {
      return null
    }
    return normalizeShippingData(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeCheckoutShippingDraft(data: ShippingData) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.setItem(CHECKOUT_SHIPPING_DRAFT_KEY, JSON.stringify(data))
  } catch {
    // Draft persistence is best-effort and should never block checkout.
  }
}

export function clearCheckoutShippingDraft() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.sessionStorage.removeItem(CHECKOUT_SHIPPING_DRAFT_KEY)
  } catch {
    // Draft cleanup is best-effort.
  }
}

export function hasMissingShippingFields(data: ShippingData): boolean {
  const required = [data.firstName, data.lastName, data.email, data.street, data.city, data.zip]
  return required.some((value) => !value.trim())
}

export function getShippingFieldErrors(data: ShippingData): ShippingFieldErrors {
  const errors: ShippingFieldErrors = {}

  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Ungültige E-Mail-Adresse'
  }

  if (data.zip.trim() && !ZIP_REGEX.test(data.zip.trim())) {
    errors.zip = 'Ungültige PLZ'
  }

  const phone = data.phone.trim()
  if (phone && phone.length < 6) {
    errors.phone = 'Bitte Telefonnummer prüfen'
  }

  return errors
}

export function getShippingValidationError(data: ShippingData): string | null {
  if (hasMissingShippingFields(data)) {
    return 'Bitte fülle alle Pflichtfelder für die Lieferung aus.'
  }

  const fieldErrors = getShippingFieldErrors(data)
  if (fieldErrors.email) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.'
  }
  if (fieldErrors.zip) {
    return 'Bitte gib eine gültige PLZ ein.'
  }
  if (fieldErrors.phone) {
    return 'Bitte prüfe die Telefonnummer.'
  }

  return null
}

export function buildCheckoutPayload(
  shippingData: ShippingData,
  segment: 'b2c' | 'b2b',
  shippingCost: number,
  items: CartItem[],
): CheckoutSessionPayload {
  return {
    email: shippingData.email,
    currency: 'EUR',
    shipping_method: shippingCost === 0 ? 'standard_free' : 'standard',
    customer_type: segment,
    company_name: segment === 'b2b' ? shippingData.companyName : '',
    vat_id: segment === 'b2b' ? shippingData.vatId : '',
    purchase_order_ref: segment === 'b2b' ? shippingData.purchaseOrderRef : '',
    shipping_address: {
      first_name: shippingData.firstName.trim(),
      last_name: shippingData.lastName.trim(),
      street1: shippingData.street.trim(),
      street2: '',
      city: shippingData.city.trim(),
      zip: shippingData.zip.trim(),
      country: shippingData.country.trim(),
      phone: shippingData.phone.trim(),
    },
    items: items.map((item) => ({
      sku: item.product.id,
      title: item.name,
      quantity: item.quantity,
      unit_price_amount: Math.round(item.price * 100),
    })),
  }
}
