const DEFAULT_API_BASE_URL = 'http://localhost:8080'
const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function strictApiBaseUrlRequired(): boolean {
  return process.env.NODE_ENV === 'production'
}

function allowLocalApiInProduction(): boolean {
  return String(process.env.WEB_RUNTIME_ALLOW_LOCAL_API || '').trim().toLowerCase() === 'true'
}

function normalizeApiBaseUrl(value: string | undefined, strict: boolean): string {
  if (!value) {
    if (strict) {
      throw new Error('api_base_url_missing')
    }
    return DEFAULT_API_BASE_URL
  }

  const trimmed = value.trim()
  if (!trimmed) {
    if (strict) {
      throw new Error('api_base_url_missing')
    }
    return DEFAULT_API_BASE_URL
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('api_base_url_invalid')
    }
    if (strict && LOCAL_API_HOSTS.has(parsed.hostname.toLowerCase()) && !allowLocalApiInProduction()) {
      throw new Error('api_base_url_localhost_not_allowed')
    }
    const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
    return `${parsed.origin}${normalizedPath}`
  } catch (error) {
    if (strict && error instanceof Error) {
      throw error
    }
    return DEFAULT_API_BASE_URL
  }
}

function resolveConfiguredApiBaseUrl(strict: boolean): string {
  const internalRaw = process.env.INTERNAL_API_URL
  const internal = internalRaw ? normalizeApiBaseUrl(internalRaw, strict) : ''
  return internal
}

export function getApiBaseUrl(): string {
  const strict = strictApiBaseUrlRequired()
  const configured = resolveConfiguredApiBaseUrl(strict)
  if (configured) {
    return configured
  }
  if (strict) {
    throw new Error('api_base_url_missing')
  }
  return DEFAULT_API_BASE_URL
}

export function getApiBaseUrlIfConfigured(): string {
  const hasConfiguredValue = Boolean(String(process.env.INTERNAL_API_URL || '').trim())
  if (!hasConfiguredValue) {
    return ''
  }

  try {
    return resolveConfiguredApiBaseUrl(strictApiBaseUrlRequired())
  } catch {
    return ''
  }
}
