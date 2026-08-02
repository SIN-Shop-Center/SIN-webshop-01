import 'server-only'

const TIKTOK_MULTIPLIER = Number(process.env.TIKTOK_PRICE_MULTIPLIER ?? '2.8')
export const TIKTOK_CURRENCY = process.env.TIKTOK_CURRENCY ?? 'EUR'
export const TIKTOK_SAVE_MODE = process.env.TIKTOK_SAVE_MODE === 'LISTING' ? 'LISTING' : 'AS_DRAFT'
export const MIN_QUALITY = Number(process.env.TIKTOK_MIN_DATA_QUALITY ?? '80')

export function calcTikTokPrice(costUsd: number, fallbackPrice: number): string {
  const base = costUsd > 0 ? costUsd * TIKTOK_MULTIPLIER : fallbackPrice
  if (!Number.isFinite(base) || base <= 0) throw new Error('Ungültiger TikTok-Preis')
  return (Math.ceil(base) - 0.01).toFixed(2)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function asRecord(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => {
          const row = item as Record<string, unknown>
          return [String(row.name || row.key || ''), String(row.value || '')]
        })
        .filter(([key, item]) => key && item),
    )
  }
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => ['string', 'number', 'boolean'].includes(typeof item))
      .map(([key, item]) => [key, String(item)]),
  )
}

export function buildDescription(p: {
  description: string
  features?: unknown
  specifications?: unknown
  manufacturerName?: string | null
  responsiblePersonName?: string | null
  responsiblePersonCompany?: string | null
  responsiblePersonAddress?: string | null
  responsiblePersonEmail?: string | null
}): string {
  const features = asStringArray(p.features)
    .slice(0, 8)
    .map((feature) => `<li>${escapeHtml(feature)}</li>`)
    .join('')
  const specs = Object.entries(asRecord(p.specifications))
    .slice(0, 20)
    .map(([key, value]) => `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`)
    .join('')
  const responsiblePerson = [
    p.responsiblePersonName,
    p.responsiblePersonCompany,
    p.responsiblePersonAddress,
    p.responsiblePersonEmail,
  ].filter(Boolean).map((value) => escapeHtml(String(value))).join(' · ')

  return [
    `<p>${escapeHtml(p.description)}</p>`,
    features ? `<p><strong>Highlights:</strong></p><ul>${features}</ul>` : '',
    specs ? `<p><strong>Details:</strong></p><ul>${specs}</ul>` : '',
    p.manufacturerName
      ? `<p><strong>Hersteller:</strong> ${escapeHtml(p.manufacturerName)}</p>`
      : '',
    responsiblePerson
      ? `<p><strong>EU-Verantwortlicher:</strong> ${responsiblePerson}</p>`
      : '',
  ].filter(Boolean).join('')
}
