#!/usr/bin/env node

import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const WEB_DIR = join(ROOT, 'apps', 'web')
const BUILD_MANIFEST_PATH = join(WEB_DIR, '.next', 'build-manifest.json')
const STANDALONE_SERVER_PATH = join(WEB_DIR, '.next', 'standalone', 'server.js')
const HOST = '127.0.0.1'
const PORT = Number.parseInt(process.env.WEB_RUNTIME_PORT || '4010', 10)
const START_TIMEOUT_MS = Number.parseInt(process.env.WEB_RUNTIME_START_TIMEOUT_MS || '60000', 10)
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.WEB_RUNTIME_REQUEST_TIMEOUT_MS || '8000', 10)
const REQUIRE_HEALTHY_API = String(process.env.WEB_RUNTIME_REQUIRE_HEALTHY_API || 'true').trim().toLowerCase() !== 'false'
const AUTO_STUB_API = String(process.env.WEB_RUNTIME_AUTO_STUB_API || 'false').trim().toLowerCase() === 'true'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
const rawRuntimeSiteUrl = String(process.env.SITE_URL || '').trim()
const rawRuntimePublicAppUrl = String(process.env.NEXT_PUBLIC_APP_URL || '').trim()
const rawInternalApiUrl = String(process.env.INTERNAL_API_URL || '').trim()
const rawPublicApiUrl = String(process.env.NEXT_PUBLIC_API_URL || '').trim()
const DISALLOWED_ABSOLUTE_URL_PATTERNS = [
  'https://runtime-check.invalid',
  'https://shop.example.com',
]

const REQUIRED_SECURITY_HEADERS = [
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
]

const PAGE_CHECKS = [
  { pathname: '/', mode: 'html' },
  { pathname: '/products', mode: 'html' },
  { pathname: '/cart', mode: 'html' },
  { pathname: '/checkout', mode: 'html' },
  { pathname: '/checkout/success', mode: 'html' },
  { pathname: '/login', mode: 'html' },
  {
    pathname: '/kundencenter',
    mode: 'html-or-redirect',
    redirectPrefix: '/login?next=%2Fkundencenter',
  },
  {
    pathname: '/kundencenter/login',
    mode: 'redirect',
    redirectPrefix: '/login?next=%2Fkundencenter',
  },
  {
    pathname: '/admin/login',
    mode: 'redirect',
    redirectPrefix: '/login?next=%2Fadmin',
  },
  { pathname: '/a2a', mode: 'html' },
  { pathname: '/forbidden', mode: 'html' },
  { pathname: '/kontakt', mode: 'html' },
  { pathname: '/faq', mode: 'html' },
  { pathname: '/impressum', mode: 'html' },
  { pathname: '/datenschutz', mode: 'html' },
  { pathname: '/agb', mode: 'html' },
  { pathname: '/widerrufsrecht', mode: 'html' },
]

const NON_HTML_CHECKS = [
  {
    pathname: '/sitemap.xml',
    expectedStatus: 200,
    expectedContentType: 'xml',
    requiredBodySnippet: '<urlset',
    requiredAbsoluteUrl: () => RUNTIME_PUBLIC_APP_URL,
  },
  {
    pathname: '/robots.txt',
    expectedStatus: 200,
    expectedContentType: 'text/plain',
    requiredBodySnippet: 'Sitemap:',
    requiredAbsoluteUrl: () => `${RUNTIME_SITE_URL}/sitemap.xml`,
  },
]

const LOCAL_ABSOLUTE_URL_PATTERNS = [
  'http://localhost:',
  'https://localhost:',
  'http://127.0.0.1',
  'https://127.0.0.1',
]

function fail(message) {
  console.error(message)
  process.exit(1)
}

function normalizeRuntimeUrl(name, value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) {
    return ''
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    fail(`${name} must be a valid absolute URL before runtime web checks.`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail(`${name} must use http or https before runtime web checks.`)
  }
  if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    fail(`${name} must not point to localhost for runtime web checks.`)
  }
  if (parsed.hostname.toLowerCase().endsWith('.invalid') || parsed.hostname.toLowerCase() === 'shop.example.com') {
    fail(`${name} must not point to placeholder hosts for runtime web checks.`)
  }

  parsed.pathname = ''
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

const normalizedRuntimeSiteUrl = normalizeRuntimeUrl('SITE_URL', rawRuntimeSiteUrl)
const normalizedRuntimePublicAppUrl = normalizeRuntimeUrl('NEXT_PUBLIC_APP_URL', rawRuntimePublicAppUrl)
const RUNTIME_SITE_URL = normalizedRuntimeSiteUrl || normalizedRuntimePublicAppUrl
const RUNTIME_PUBLIC_APP_URL = normalizedRuntimePublicAppUrl || normalizedRuntimeSiteUrl

if (!Number.isFinite(PORT) || PORT < 1024 || PORT > 65535) {
  fail('WEB_RUNTIME_PORT must be a valid TCP port between 1024 and 65535.')
}
if (!RUNTIME_SITE_URL || !RUNTIME_PUBLIC_APP_URL) {
  fail('SITE_URL or NEXT_PUBLIC_APP_URL must be set before runtime web checks.')
}
if (normalizedRuntimeSiteUrl && normalizedRuntimePublicAppUrl && normalizedRuntimeSiteUrl !== normalizedRuntimePublicAppUrl) {
  fail(`SITE_URL (${normalizedRuntimeSiteUrl}) and NEXT_PUBLIC_APP_URL (${normalizedRuntimePublicAppUrl}) must match before runtime web checks.`)
}
if (!existsSync(BUILD_MANIFEST_PATH) && !existsSync(STANDALONE_SERVER_PATH)) {
  fail('Missing apps/web/.next build output. Run `pnpm run build` before runtime checks.')
}

const baseURL = `http://${HOST}:${PORT}`

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function startRuntimeApiStub() {
  const server = createServer((req, res) => {
    if (req.url === '/ready' || req.url === '/ready/') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          status: 'ready',
          commerce: {
            ready_suppliers: 1,
            ready_products: 1,
            active_products: 1,
          },
        }),
      )
      return
    }

    if (req.url === '/health' || req.url === '/health/') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ status: 'ok', service: 'runtime-api-stub' }))
      return
    }

    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ status: 'not_found' }))
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Unable to resolve runtime API stub address.')
  }

  const baseUrl = `http://127.0.0.1:${address.port}`
  console.log(`[api:stub] Ready endpoint available at ${baseUrl}/ready`)
  return { server, baseUrl }
}

function normalizeRedirectTarget(location) {
  if (!location) {
    return ''
  }
  try {
    const parsed = new URL(location, baseURL)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return location
  }
}

function extractRedirectTargetFromBody(body) {
  const match = body.match(/NEXT_REDIRECT;[^;]*;([^;]+);30[78];/)
  return match ? match[1] : ''
}

function redirectMatches(target, expectedPrefix) {
  if (!expectedPrefix) {
    return true
  }
  if (target.startsWith(expectedPrefix)) {
    return true
  }
  try {
    return decodeURIComponent(target).startsWith(decodeURIComponent(expectedPrefix))
  } catch {
    return false
  }
}

async function assertPortAvailable() {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: PORT })
    let settled = false

    function finish(error) {
      if (settled) {
        return
      }
      settled = true
      socket.destroy()
      if (error) {
        reject(error)
        return
      }
      resolve()
    }

    socket.once('connect', () => {
      finish(new Error(`WEB_RUNTIME_PORT ${PORT} is already in use on ${HOST}.`))
    })
    socket.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
        finish()
        return
      }
      finish(error instanceof Error ? error : new Error(String(error)))
    })
    socket.setTimeout(750, () => {
      finish(new Error(`WEB_RUNTIME_PORT ${PORT} availability probe timed out on ${HOST}.`))
    })
  })
}

async function fetchWithTimeout(pathname) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(`${baseURL}${pathname}`, {
      method: 'GET',
      headers: { accept: 'text/html,application/json' },
      signal: controller.signal,
      redirect: 'manual',
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForServerReady(isChildExited, childExitSummary) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    if (isChildExited()) {
      fail(`Web runtime exited before readiness probe succeeded (${childExitSummary()}).`)
    }
    try {
      const response = await fetchWithTimeout('/')
      if (response.status === 200) {
        return
      }
    } catch {
      // Keep polling until timeout.
    }
    await wait(500)
  }
  fail(`Web runtime did not become ready within ${START_TIMEOUT_MS}ms on ${baseURL}.`)
}

function assertSecurityHeaders(pathname, response) {
  const missing = REQUIRED_SECURITY_HEADERS.filter((header) => !response.headers.get(header))
  if (missing.length > 0) {
    throw new Error(`${pathname} missing security headers: ${missing.join(', ')}`)
  }
}

function assertNoLocalAbsoluteUrls(pathname, body) {
  const hit = LOCAL_ABSOLUTE_URL_PATTERNS.find((pattern) => body.includes(pattern))
  if (hit) {
    throw new Error(`${pathname} leaked local absolute url: ${hit}`)
  }
}

function assertNoPlaceholderAbsoluteUrls(pathname, body) {
  const hit = DISALLOWED_ABSOLUTE_URL_PATTERNS.find((pattern) => body.includes(pattern))
  if (hit) {
    throw new Error(`${pathname} leaked placeholder absolute url: ${hit}`)
  }
}

function assertContainsExpectedAbsoluteUrl(pathname, body, requiredAbsoluteUrl) {
  if (!requiredAbsoluteUrl) {
    return
  }
  if (!body.includes(requiredAbsoluteUrl)) {
    throw new Error(`${pathname} failed: missing expected absolute url ${requiredAbsoluteUrl}`)
  }
}

async function runChecks() {
  const results = []

  for (const pageCheck of PAGE_CHECKS) {
    const response = await fetchWithTimeout(pageCheck.pathname)
    assertSecurityHeaders(pageCheck.pathname, response)

    if (pageCheck.mode === 'redirect' || pageCheck.mode === 'html-or-redirect') {
      const location = response.headers.get('location') || ''
      const isRedirect = response.status === 307 || response.status === 308
      if (isRedirect) {
        let redirectTarget = normalizeRedirectTarget(location)
        if (!redirectTarget) {
          const body = await response.text()
          redirectTarget = extractRedirectTargetFromBody(body)
        }
        if (!redirectMatches(redirectTarget, pageCheck.redirectPrefix || '')) {
          throw new Error(`${pageCheck.pathname} failed redirect check: status=${response.status} location=${location}`)
        }
        results.push({ pathname: pageCheck.pathname, status: response.status })
        continue
      }
      if (pageCheck.mode === 'redirect') {
        throw new Error(`${pageCheck.pathname} expected redirect but returned status=${response.status}`)
      }
    }

    const body = await response.text()
    const okStatus = response.status === 200
    const hasHtml = body.includes('<html') || body.includes('<!DOCTYPE html')

    if (!okStatus || !hasHtml) {
      throw new Error(`${pageCheck.pathname} failed: status=${response.status} html=${hasHtml}`)
    }
    assertNoLocalAbsoluteUrls(pageCheck.pathname, body)
    assertNoPlaceholderAbsoluteUrls(pageCheck.pathname, body)

    results.push({ pathname: pageCheck.pathname, status: response.status })
  }

  for (const item of NON_HTML_CHECKS) {
    const response = await fetchWithTimeout(item.pathname)
    assertSecurityHeaders(item.pathname, response)

    const body = await response.text()
    const contentType = response.headers.get('content-type') || ''
    if (response.status !== item.expectedStatus) {
      throw new Error(`${item.pathname} failed: status=${response.status}`)
    }
    if (!contentType.includes(item.expectedContentType)) {
      throw new Error(`${item.pathname} failed: content-type=${contentType}`)
    }
    if (!body.includes(item.requiredBodySnippet)) {
      throw new Error(`${item.pathname} failed: missing expected body marker`)
    }
    assertNoLocalAbsoluteUrls(item.pathname, body)
    assertNoPlaceholderAbsoluteUrls(item.pathname, body)
    assertContainsExpectedAbsoluteUrl(item.pathname, body, item.requiredAbsoluteUrl?.())

    results.push({ pathname: item.pathname, status: response.status })
  }

  const healthRes = await fetchWithTimeout('/api/health')
  assertSecurityHeaders('/api/health', healthRes)
  const healthPayload = await healthRes.json().catch(() => null)
  if (REQUIRE_HEALTHY_API) {
    if (healthRes.status !== 200) {
      throw new Error(`/api/health failed strict check: status=${healthRes.status} payload=${JSON.stringify(healthPayload)}`)
    }
  } else if (healthRes.status !== 200 && healthRes.status !== 503) {
    throw new Error(`/api/health failed: status=${healthRes.status} payload=${JSON.stringify(healthPayload)}`)
  }

  return results
}

async function main() {
  await assertPortAvailable()

  let apiStub = null
  let internalApiUrl = rawInternalApiUrl || rawPublicApiUrl
  let publicApiUrl = rawPublicApiUrl || rawInternalApiUrl
  let allowLocalApi = false

  if (!internalApiUrl && !publicApiUrl && AUTO_STUB_API) {
    apiStub = await startRuntimeApiStub()
    internalApiUrl = apiStub.baseUrl
    publicApiUrl = apiStub.baseUrl
    allowLocalApi = true
  }

  const runtimeEnv = {
    ...process.env,
    NODE_ENV: 'production',
    SITE_URL: RUNTIME_SITE_URL,
    NEXT_PUBLIC_APP_URL: RUNTIME_PUBLIC_APP_URL,
    INTERNAL_API_URL: internalApiUrl,
    NEXT_PUBLIC_API_URL: publicApiUrl,
    WEB_RUNTIME_ALLOW_LOCAL_API: allowLocalApi ? 'true' : String(process.env.WEB_RUNTIME_ALLOW_LOCAL_API || ''),
  }

  const child = existsSync(STANDALONE_SERVER_PATH)
    ? spawn(process.execPath, [STANDALONE_SERVER_PATH], {
        cwd: WEB_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...runtimeEnv,
          HOSTNAME: HOST,
          PORT: String(PORT),
        },
      })
    : spawn('pnpm', ['exec', 'next', 'start', '--hostname', HOST, '--port', String(PORT)], {
        cwd: WEB_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: runtimeEnv,
      })

  let childExited = false
  let childExitCode = null
  let childExitSignal = null
  child.on('exit', (code, signal) => {
    childExited = true
    childExitCode = code
    childExitSignal = signal
  })

  function childExitSummary() {
    if (childExitCode !== null) {
      return `code=${childExitCode}`
    }
    if (childExitSignal) {
      return `signal=${childExitSignal}`
    }
    return 'unknown exit'
  }

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[web:start] ${chunk}`)
  })
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[web:start] ${chunk}`)
  })

  try {
    await waitForServerReady(() => childExited, childExitSummary)
    if (childExited) {
      fail(`Web runtime exited before checks started (${childExitSummary()}).`)
    }
    const results = await runChecks()
    console.log(`Runtime web checks passed (${results.length} pages + health endpoint).`)
  } finally {
    if (!childExited) {
      child.kill('SIGTERM')
      await wait(400)
      if (!childExited) {
        child.kill('SIGKILL')
      }
    }
    if (apiStub?.server) {
      await new Promise((resolve) => apiStub.server.close(() => resolve()))
    }
  }
}

await main()
