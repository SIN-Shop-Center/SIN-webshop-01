const DEFAULT_SITE_URL = 'http://localhost:3000'
const LOCAL_SITE_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export const SITE_NAME = 'Simone Shop'
export const SITE_DESCRIPTION =
  'Preis, Lieferung und Rückgabe bleiben vor dem Kauf sichtbar. Für Privatkunden und Firmen mit klaren nächsten Schritten.'
export const DEFAULT_LOCALE = 'de_DE'
export const DEFAULT_CURRENCY = 'EUR'

function strictSiteUrlRequired(): boolean {
  // Next sets NODE_ENV=production during `next build` even for local builds.
  // We only want strict public-site URL enforcement in real production deployments.
  // CI/go-live pipelines already enforce this via `scripts/with-web-production-env.mjs`.
  return process.env.VERCEL_ENV === 'production'
}

function normalizeSiteUrl(value?: string): string {
  const strict = strictSiteUrlRequired()
  const trimmed = value?.trim() || ''
  if (!trimmed) {
    if (strict) {
      throw new Error('site_url_missing')
    }
    return DEFAULT_SITE_URL
  }

  try {
    const parsed = new URL(trimmed)
    if (strict && LOCAL_SITE_HOSTS.has(parsed.hostname.toLowerCase())) {
      throw new Error('site_url_localhost_not_allowed')
    }
    parsed.pathname = ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch (error) {
    if (strict) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('site_url_invalid')
    }
    return DEFAULT_SITE_URL
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL)
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getSiteUrl()}${normalizedPath}`
}
