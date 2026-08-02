#!/usr/bin/env node

const baseInput = String(
  process.env.SMOKE_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || '',
).trim()
const cronSecret = String(process.env.CRON_SECRET || '').trim()
const timeoutMs = Number.parseInt(String(process.env.SMOKE_TIMEOUT_MS || '10000'), 10)

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (!baseInput) fail('Missing SMOKE_BASE_URL, NEXT_PUBLIC_APP_URL or SITE_URL.')
if (!cronSecret) fail('Missing CRON_SECRET for authenticated deep health check.')
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000) fail('SMOKE_TIMEOUT_MS must be >= 1000.')

let baseURL
try {
  const parsed = new URL(baseInput)
  if (parsed.protocol !== 'https:') fail('Production smoke URL must use https://')
  if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase())) {
    fail('Production smoke URL must not point to localhost.')
  }
  parsed.pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
  parsed.search = ''
  parsed.hash = ''
  baseURL = parsed.toString().replace(/\/$/, '')
} catch (error) {
  fail(`Invalid production smoke URL: ${error instanceof Error ? error.message : String(error)}`)
}

const checks = [
  {
    name: 'public health',
    path: '/api/health',
    statuses: [200],
    validate: async (response) => {
      const payload = await response.json().catch(() => null)
      return payload?.status === 'ok' ? '' : 'health payload did not report status=ok'
    },
  },
  {
    name: 'database readiness',
    path: '/api/healthz',
    statuses: [200],
    validate: async (response) => {
      const payload = await response.json().catch(() => null)
      return payload?.db === 'up' ? '' : 'database readiness did not report db=up'
    },
  },
  {
    name: 'deep commerce health',
    path: '/api/cron/health-check',
    statuses: [200],
    headers: { Authorization: `Bearer ${cronSecret}` },
    validate: async (response) => {
      const payload = await response.json().catch(() => null)
      return payload?.status === 'ok' ? '' : 'deep health did not report status=ok'
    },
  },
  {
    name: 'homepage',
    path: '/',
    statuses: [200],
    validate: async (response) => {
      const html = await response.text()
      if (!html.includes('ShopSIN')) return 'ShopSIN identity missing'
      if (html.includes('Simone Shop')) return 'legacy Simone Shop identity present'
      return ''
    },
  },
  { name: 'catalog', path: '/produkte', statuses: [200] },
  { name: 'impressum', path: '/impressum', statuses: [200] },
  { name: 'privacy', path: '/datenschutz', statuses: [200] },
  { name: 'withdrawal', path: '/widerrufsrecht', statuses: [200] },
]

async function runCheck(check) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()
  try {
    const response = await fetch(`${baseURL}${check.path}`, {
      headers: { Accept: 'text/html,application/json', ...(check.headers || {}) },
      redirect: 'manual',
      signal: controller.signal,
    })
    const elapsed = Date.now() - started
    if (!check.statuses.includes(response.status)) {
      return { ...check, ok: false, status: response.status, elapsed, error: 'unexpected status' }
    }
    const validationError = check.validate ? await check.validate(response.clone()) : ''
    return {
      ...check,
      ok: !validationError,
      status: response.status,
      elapsed,
      error: validationError || '',
    }
  } catch (error) {
    return {
      ...check,
      ok: false,
      status: 0,
      elapsed: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

console.log(`Running ShopSIN go-live smoke checks against ${baseURL}`)
const results = []
for (const check of checks) {
  const result = await runCheck(check)
  results.push(result)
  if (result.ok) {
    console.log(`PASS ${result.name} status=${result.status} time=${result.elapsed}ms`)
  } else {
    console.error(`FAIL ${result.name} status=${result.status} time=${result.elapsed}ms error=${result.error}`)
  }
}

const failed = results.filter((result) => !result.ok)
if (failed.length) {
  console.error(`ShopSIN go-live smoke checks failed (${failed.length}/${results.length}).`)
  process.exit(1)
}

console.log(`ShopSIN go-live smoke checks passed (${results.length}/${results.length}).`)
