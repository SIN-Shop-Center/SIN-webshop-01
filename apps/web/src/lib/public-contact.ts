import { STOREFRONT_LEGAL_CONTACT } from './storefront-legal'

function readPublicEnv(name: 'NEXT_PUBLIC_SUPPORT_EMAIL' | 'NEXT_PUBLIC_B2B_EMAIL' | 'NEXT_PUBLIC_CONTACT_PHONE'): string {
  return String(process.env[name] || '').trim()
}

export const PUBLIC_SUPPORT_EMAIL = readPublicEnv('NEXT_PUBLIC_SUPPORT_EMAIL') || STOREFRONT_LEGAL_CONTACT.legalEmail
export const PUBLIC_B2B_EMAIL = readPublicEnv('NEXT_PUBLIC_B2B_EMAIL') || PUBLIC_SUPPORT_EMAIL
export const PUBLIC_CONTACT_PHONE = readPublicEnv('NEXT_PUBLIC_CONTACT_PHONE') || STOREFRONT_LEGAL_CONTACT.legalPhone
