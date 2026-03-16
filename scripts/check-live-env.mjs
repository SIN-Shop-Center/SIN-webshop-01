#!/usr/bin/env node

import { FEATURE_TIKTOK_SHOP_KEYS, PLACEHOLDER_SNIPPETS, REQUIRED_RUNTIME_KEYS, REQUIRED_SMOKE_KEYS } from './live-env-schema.mjs'

const withSmoke = process.argv.includes('--with-smoke')
const failures = []
const warnings = []

function valueOf(name) {
  return String(process.env[name] || '').trim()
}

function pushFailure(message) {
  failures.push(message)
}

function requireValue(name) {
  const value = valueOf(name)
  if (!value) {
    pushFailure(`${name} is required`)
  }
  return value
}

function requireExplicitFalse(name) {
  const value = valueOf(name)
  if (!value) {
    pushFailure(`${name} must be set explicitly for go-live`)
    return
  }
  if (value !== 'false') {
    pushFailure(`${name} must be false for go-live`)
  }
}

function validateNoPlaceholder(name, value) {
  if (!value) {
    return
  }
  const hit = PLACEHOLDER_SNIPPETS.find((snippet) => value.includes(snippet))
  if (hit) {
    pushFailure(`${name} looks like a placeholder value (${hit})`)
  }
}

function validateURL(name, value, options = {}) {
  if (!value) {
    return null
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch (error) {
    pushFailure(`${name} must be a valid URL (${error instanceof Error ? error.message : String(error)})`)
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    pushFailure(`${name} must use http:// or https://`)
    return null
  }

  if (options.disallowLocalhost) {
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      pushFailure(`${name} must not point to localhost for go-live`)
    }
  }

  return parsed
}

function validateDatabaseURL(value) {
  if (!value) {
    return
  }
  let parsed
  try {
    parsed = new URL(value)
  } catch (error) {
    pushFailure(`DATABASE_URL must be a valid URL (${error instanceof Error ? error.message : String(error)})`)
    return
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    pushFailure('DATABASE_URL must use postgres:// or postgresql://')
  }
}

function validateCSVOrigins(name, value) {
  if (!value) {
    return []
  }
  const origins = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (origins.length === 0) {
    pushFailure(`${name} must contain at least one origin`)
    return []
  }

  for (const origin of origins) {
    validateURL(`${name} origin "${origin}"`, origin, { disallowLocalhost: true })
  }

  return origins
}

function validateEmailish(name, value) {
  if (!value) {
    return
  }
  if (!value.includes('@')) {
    pushFailure(`${name} must contain an email address`)
  }
}

function validateTikTokShopFeatureSet() {
  const values = Object.fromEntries(FEATURE_TIKTOK_SHOP_KEYS.map((key) => [key, valueOf(key)]))
  const anyConfigured = Object.values(values).some(Boolean)
  if (!anyConfigured) {
    return
  }

  const requiredWhenEnabled = [
    'TIKTOK_SHOP_CLIENT_KEY',
    'TIKTOK_SHOP_CLIENT_SECRET',
    'TIKTOK_SHOP_REDIRECT_URI',
    'TIKTOK_SHOP_CONNECT_SCOPES',
    'TIKTOK_SHOP_CALLBACK_SECRET',
  ]

  for (const key of requiredWhenEnabled) {
    if (!values[key]) {
      pushFailure(`${key} is required when TikTok Shop browser connect is enabled`)
    }
    validateNoPlaceholder(key, values[key])
  }

  if (!values.TIKTOK_SHOP_CODE_VERIFIER && !values.TIKTOK_SHOP_CODE_CHALLENGE) {
    pushFailure('Provide TIKTOK_SHOP_CODE_VERIFIER or TIKTOK_SHOP_CODE_CHALLENGE when TikTok Shop browser connect is enabled')
  }

  if (values.TIKTOK_SHOP_REDIRECT_URI) {
    validateURL('TIKTOK_SHOP_REDIRECT_URI', values.TIKTOK_SHOP_REDIRECT_URI, { disallowLocalhost: true })
  }

  if (values.TIKTOK_SHOP_CONNECT_SCOPES) {
    const scopes = values.TIKTOK_SHOP_CONNECT_SCOPES
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
    if (scopes.length === 0) {
      pushFailure('TIKTOK_SHOP_CONNECT_SCOPES must contain at least one explicit merchant scope')
    }
    if (scopes.includes('user.info.basic')) {
      pushFailure('TIKTOK_SHOP_CONNECT_SCOPES must not fall back to generic user.info.basic for TikTok Shop go-live')
    }
  }
}

const runtimeValues = Object.fromEntries(REQUIRED_RUNTIME_KEYS.map((key) => [key, requireValue(key)]))
for (const key of REQUIRED_RUNTIME_KEYS) {
  validateNoPlaceholder(key, runtimeValues[key])
}

const databaseURL = runtimeValues.DATABASE_URL
validateDatabaseURL(databaseURL)

function normalizeComparableURL(parsed) {
  return `${parsed.origin}${parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')}`
}

const corsAllowlist = runtimeValues.CORS_ALLOWLIST
const corsOrigins = validateCSVOrigins('CORS_ALLOWLIST', corsAllowlist)

const siteURL = runtimeValues.SITE_URL
const siteURLParsed = validateURL('SITE_URL', siteURL, { disallowLocalhost: true })

const publicAppURL = runtimeValues.NEXT_PUBLIC_APP_URL
const publicAppURLParsed = validateURL('NEXT_PUBLIC_APP_URL', publicAppURL, { disallowLocalhost: true })
if (siteURLParsed && publicAppURLParsed) {
  const normalizedSiteURL = normalizeComparableURL(siteURLParsed)
  const normalizedPublicAppURL = normalizeComparableURL(publicAppURLParsed)
  if (normalizedSiteURL !== normalizedPublicAppURL) {
    pushFailure('NEXT_PUBLIC_APP_URL must match SITE_URL for go-live')
  }
}
if (siteURLParsed) {
  const siteOrigin = siteURLParsed.origin
  if (!corsOrigins.includes(siteOrigin)) {
    pushFailure('CORS_ALLOWLIST must include the SITE_URL origin for go-live')
  }
}

const internalAPIURL = valueOf('INTERNAL_API_URL')
const publicAPIURL = valueOf('NEXT_PUBLIC_API_URL')
const apiProxyURL = internalAPIURL || publicAPIURL
if (!apiProxyURL) {
  pushFailure('INTERNAL_API_URL or NEXT_PUBLIC_API_URL is required for web API proxy routes')
} else {
  const internalAPIURLParsed = internalAPIURL
    ? validateURL('INTERNAL_API_URL', internalAPIURL, { disallowLocalhost: true })
    : null
  const publicAPIURLParsed = publicAPIURL
    ? validateURL('NEXT_PUBLIC_API_URL', publicAPIURL, { disallowLocalhost: true })
    : null
  validateNoPlaceholder('INTERNAL_API_URL/NEXT_PUBLIC_API_URL', apiProxyURL)

  if (internalAPIURLParsed && publicAPIURLParsed) {
    const normalizedInternalAPIURL = normalizeComparableURL(internalAPIURLParsed)
    const normalizedPublicAPIURL = normalizeComparableURL(publicAPIURLParsed)
    if (normalizedInternalAPIURL !== normalizedPublicAPIURL) {
      pushFailure('NEXT_PUBLIC_API_URL must match INTERNAL_API_URL when both are set')
    }
  }
}

const supabaseURL = valueOf('SUPABASE_URL')
const supabaseJWKS = valueOf('SUPABASE_JWKS_URL')
const supabaseIssuer = valueOf('SUPABASE_ISSUER')

if (!supabaseURL && (!supabaseJWKS || !supabaseIssuer)) {
  pushFailure('Provide SUPABASE_URL or both SUPABASE_JWKS_URL and SUPABASE_ISSUER')
}
if (supabaseURL) {
  validateURL('SUPABASE_URL', supabaseURL)
  validateNoPlaceholder('SUPABASE_URL', supabaseURL)
}
if (supabaseJWKS) {
  validateURL('SUPABASE_JWKS_URL', supabaseJWKS)
}
if (supabaseIssuer) {
  validateURL('SUPABASE_ISSUER', supabaseIssuer)
}

const gsaJSONB64 = valueOf('GOOGLE_SERVICE_ACCOUNT_JSON_B64')
const gsaFile = valueOf('GOOGLE_SERVICE_ACCOUNT_FILE')
if (!gsaJSONB64 && !gsaFile) {
  pushFailure('GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_FILE is required')
}
validateNoPlaceholder('GOOGLE_SERVICE_ACCOUNT_JSON_B64', gsaJSONB64)

const gmailDelegatedUser = runtimeValues.GMAIL_DELEGATED_USER
validateEmailish('GMAIL_DELEGATED_USER', gmailDelegatedUser)

const gmailSenderFrom = runtimeValues.GMAIL_SENDER_FROM
validateEmailish('GMAIL_SENDER_FROM', gmailSenderFrom)

const gmailAPIBase = valueOf('GMAIL_API_BASE_URL')
if (gmailAPIBase) {
  validateURL('GMAIL_API_BASE_URL', gmailAPIBase)
}

requireExplicitFalse('NEXT_PUBLIC_WEB_CATALOG_FALLBACK_ENABLED')
requireExplicitFalse('NEXT_PUBLIC_WEB_ACCOUNT_FALLBACK_ENABLED')

if (withSmoke) {
  const smokeValues = Object.fromEntries(REQUIRED_SMOKE_KEYS.map((key) => [key, requireValue(key)]))
  const apiBase = smokeValues.API_BASE_URL
  validateNoPlaceholder('API_BASE_URL', apiBase)
  const apiBaseParsed = validateURL('API_BASE_URL', apiBase, { disallowLocalhost: true })

  if (apiBaseParsed) {
    const normalizedAPIBase = normalizeComparableURL(apiBaseParsed)
    if (internalAPIURL) {
      const internalAPIURLParsed = validateURL('INTERNAL_API_URL', internalAPIURL, { disallowLocalhost: true })
      if (internalAPIURLParsed && normalizeComparableURL(internalAPIURLParsed) !== normalizedAPIBase) {
        pushFailure('API_BASE_URL must match INTERNAL_API_URL for go-live smoke checks')
      }
    } else if (publicAPIURL) {
      const publicAPIURLParsed = validateURL('NEXT_PUBLIC_API_URL', publicAPIURL, { disallowLocalhost: true })
      if (publicAPIURLParsed && normalizeComparableURL(publicAPIURLParsed) !== normalizedAPIBase) {
        pushFailure('API_BASE_URL must match NEXT_PUBLIC_API_URL for go-live smoke checks')
      }
    }
  }

  const adminBearerToken = smokeValues.ADMIN_BEARER_TOKEN
  validateNoPlaceholder('ADMIN_BEARER_TOKEN', adminBearerToken)
  if (adminBearerToken && adminBearerToken.length < 20) {
    warnings.push('ADMIN_BEARER_TOKEN looks unusually short')
  }
}

validateTikTokShopFeatureSet()

if (warnings.length > 0) {
  console.warn('Live environment warnings:')
  for (const warning of warnings) {
    console.warn(`- ${warning}`)
  }
}

if (failures.length > 0) {
  console.error(`Live environment check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

const modeLabel = withSmoke ? 'runtime+smoke' : 'runtime'
console.log(`Live environment check passed (${modeLabel}).`)
