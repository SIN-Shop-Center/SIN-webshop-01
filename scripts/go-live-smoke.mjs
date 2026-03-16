#!/usr/bin/env node

const apiBaseInput = String(process.env.API_BASE_URL || '').trim()
const adminToken = String(process.env.ADMIN_BEARER_TOKEN || '').trim()
const timeoutMs = Number.parseInt(String(process.env.SMOKE_TIMEOUT_MS || '8000'), 10)

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (!apiBaseInput) {
  fail('Missing API_BASE_URL for smoke checks.')
}
if (!adminToken) {
  fail('Missing ADMIN_BEARER_TOKEN for admin smoke checks.')
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) {
  fail('SMOKE_TIMEOUT_MS must be a number >= 1000.')
}

let baseURL
try {
  const parsed = new URL(apiBaseInput)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('API_BASE_URL must use http:// or https://')
  }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    fail('API_BASE_URL must not point to localhost for go-live smoke checks')
  }
  const normalizedPath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : ''
  baseURL = `${parsed.origin}${normalizedPath}`
} catch (error) {
  fail(`API_BASE_URL is not a valid URL: ${error instanceof Error ? error.message : String(error)}`)
}

const checks = [
  { name: 'health', path: '/health', statuses: [200], auth: false },
  { name: 'ready', path: '/ready', statuses: [200], auth: false },
  {
    name: 'catalog.products.ready',
    path: '/api/v1/catalog/products?limit=1',
    statuses: [200],
    auth: false,
    validate: async (response) => {
      const payload = await response.json().catch(() => null)
      const items = Array.isArray(payload?.items) ? payload.items : []
      if (items.length < 1) {
        return 'catalog returned 0 live-ready products'
      }
      return null
    },
  },
  {
    name: 'admin.suppliers.ready',
    path: '/api/v1/admin/suppliers?status=approved&onboarding_status=connected&compliance_state=approved&limit=20',
    statuses: [200],
    auth: true,
    validate: async (response) => {
      const payload = await response.json().catch(() => null)
      const items = Array.isArray(payload?.data?.items) ? payload.data.items : []
      const readySuppliers = items.filter((item) => {
        if (!item || item.auto_fulfill_enabled !== true) {
          return false
        }
        if (item.fulfillment_mode === 'api') {
          return Boolean(String(item.api_endpoint || '').trim()) && item.has_secret === true
        }
        if (item.fulfillment_mode === 'email') {
          return Boolean(String(item.contact_email || item.email || '').trim())
        }
        return false
      })
      if (readySuppliers.length < 1) {
        return 'admin returned 0 connected suppliers that are fulfillable'
      }
      return null
    },
  },
  { name: 'admin.automation.health', path: '/api/v1/admin/automation/health', statuses: [200], auth: true },
  { name: 'admin.kpi.scorecard', path: '/api/v1/admin/kpi/scorecard', statuses: [200], auth: true },
  { name: 'admin.revenue.forecast', path: '/api/v1/admin/revenue/forecast?scenario=base', statuses: [200], auth: true },
  { name: 'admin.channels.list', path: '/api/v1/admin/channels', statuses: [200], auth: true },
  { name: 'admin.channel.health.tiktok', path: '/api/v1/admin/channels/tiktok/health', statuses: [200], auth: true },
]

async function runCheck(item) {
  const headers = { Accept: 'application/json' }
  if (item.auth) {
    headers.Authorization = `Bearer ${adminToken}`
  }

  const started = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${baseURL}${item.path}`, { method: 'GET', headers, signal: controller.signal })
    const elapsed = Date.now() - started
    const okStatus = item.statuses.includes(res.status)
    if (!okStatus) {
      return { name: item.name, ok: false, status: res.status, elapsed }
    }
    if (typeof item.validate === 'function') {
      const validationError = await item.validate(res.clone())
      if (validationError) {
        return { name: item.name, ok: false, status: res.status, elapsed, error: validationError }
      }
    }
    return { name: item.name, ok: true, status: res.status, elapsed }
  } catch (err) {
    const elapsed = Date.now() - started
    const reason = err instanceof Error && err.name === 'AbortError'
      ? `timeout after ${timeoutMs}ms`
      : err instanceof Error
        ? err.message
        : String(err)
    return { name: item.name, ok: false, status: 0, elapsed, error: reason }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const startedAt = Date.now()
  console.log(`Running go-live smoke checks against ${baseURL} (timeout=${timeoutMs}ms)`)
  const results = []
  for (const item of checks) {
    const result = await runCheck(item)
    results.push(result)
    if (result.ok) {
      console.log(`PASS ${result.name} status=${result.status} time=${result.elapsed}ms`)
      continue
    }
    const suffix = result.error ? ` error=${result.error}` : ''
    console.log(`FAIL ${result.name} status=${result.status} time=${result.elapsed}ms${suffix}`)
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`Smoke checks failed (${failed.length}/${results.length}).`)
    process.exit(1)
  }
  console.log(`Smoke checks passed (${results.length}/${results.length}) in ${Date.now() - startedAt}ms.`)
}

await main()
