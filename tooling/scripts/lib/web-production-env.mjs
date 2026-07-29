const LOCAL_SITE_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function normalizeAbsoluteSiteUrl(rawValue, label) {
  const trimmed = String(rawValue || '').trim()
  if (!trimmed) {
    throw new Error(`${label}_missing`)
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error(`${label}_invalid`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label}_invalid`)
  }

  const hostname = parsed.hostname.toLowerCase()
  if (LOCAL_SITE_HOSTS.has(hostname)) {
    throw new Error(`${label}_localhost_not_allowed`)
  }
  if (hostname.endsWith('.invalid') || hostname === 'shop.example.com') {
    throw new Error(`${label}_placeholder_not_allowed`)
  }

  parsed.pathname = ''
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

export function resolveWebProductionEnv(env = process.env) {
  const rawSiteUrl = String(env.SITE_URL || '').trim()
  const rawPublicAppUrl = String(env.NEXT_PUBLIC_APP_URL || '').trim()
  if (!rawSiteUrl && !rawPublicAppUrl) {
    throw new Error('site_url_missing')
  }

  const siteUrl = rawSiteUrl ? normalizeAbsoluteSiteUrl(rawSiteUrl, 'site_url') : ''
  const publicAppUrl = rawPublicAppUrl ? normalizeAbsoluteSiteUrl(rawPublicAppUrl, 'public_app_url') : ''

  if (siteUrl && publicAppUrl && siteUrl !== publicAppUrl) {
    throw new Error('site_url_mismatch')
  }

  const resolved = siteUrl || publicAppUrl
  return {
    siteUrl: siteUrl || resolved,
    publicAppUrl: publicAppUrl || resolved,
  }
}
