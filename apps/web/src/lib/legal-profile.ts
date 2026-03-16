import 'server-only'
import { PUBLIC_B2B_EMAIL, PUBLIC_CONTACT_PHONE, PUBLIC_SUPPORT_EMAIL } from './public-contact'

const PLACEHOLDER_SNIPPETS = ['change_me', 'your_', 'example', 'musterstrasse', 'musterstraße']

function cleanValue(value?: string): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  const lower = trimmed.toLowerCase()
  return PLACEHOLDER_SNIPPETS.some((snippet) => lower.includes(snippet)) ? '' : trimmed
}

export function getLegalProfile() {
  const companyName = cleanValue(process.env.BILLING_COMPANY_NAME)
  const address = cleanValue(process.env.BILLING_ADDRESS)
  const taxId = cleanValue(process.env.BILLING_TAX_ID)
  const vatId = cleanValue(process.env.BILLING_VAT_ID)
  const legalEmail = cleanValue(process.env.LEGAL_EMAIL) || PUBLIC_SUPPORT_EMAIL
  const legalPhone = cleanValue(process.env.LEGAL_PHONE) || PUBLIC_CONTACT_PHONE
  const b2bEmail = cleanValue(process.env.B2B_EMAIL) || PUBLIC_B2B_EMAIL
  return {
    companyName,
    addressLines: address ? address.split(',').map((part) => part.trim()).filter(Boolean) : [],
    taxId,
    vatId,
    legalEmail,
    legalPhone,
    b2bEmail,
    supportEmail: PUBLIC_SUPPORT_EMAIL,
    hasConfiguredImpressum: Boolean(companyName && address),
  }
}
