#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const HOST = '127.0.0.1'
const PORT = Number.parseInt(String(process.env.WEB_RUNTIME_PORT || '3217'), 10)
const STARTUP_TIMEOUT_MS = Number.parseInt(String(process.env.WEB_RUNTIME_STARTUP_TIMEOUT_MS || '45000'), 10)
const REQUEST_TIMEOUT_MS = Number.parseInt(String(process.env.WEB_RUNTIME_REQUEST_TIMEOUT_MS || '10000'), 10)
const REQUIRE_HEALTHY_API = String(process.env.WEB_RUNTIME_REQUIRE_HEALTHY_API || 'false').toLowerCase() === 'true'
const BASE_URL = `http://${HOST}:${PORT}`

function precondition(condition, message) {
  if (condition) return
  console.error(message)
  process.exit(1)
}

precondition(
  Number.isInteger(PORT) && PORT >= 1024 && PORT <= 65535,
  'WEB_RUNTIME_PORT must be an integer between 1024 and 65535.',
)
precondition(
  existsSync(join(ROOT, '.next', 'BUILD_ID')),
  'Missing .next/BUILD_ID. Run pnpm build before the runtime check.',
)

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
precondition(existsSync(nextBin), `Next.js runtime binary not found: ${nextBin}`)

const output = []
const child = spawn(process.execPath, [nextBin, 'start', '-H', HOST, '-p', String(PORT)], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), HOSTNAME: HOST },
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', (chunk) => output.push(String(chunk)))
child.stderr.on('data', (chunk) => output.push(String(chunk)))

let stopRequested = false
function stopServer() {
  if (stopRequested || child.exitCode != null) return
  stopRequested = true
  child.kill('SIGTERM')
  setTimeout(() => {
    if (child.exitCode == null) child.kill('SIGKILL')
  }, 3000).unref()
}

for (const [signal, exitCode] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
]) {
  process.on(signal, () => {
    stopServer()
    process.exitCode = exitCode
  })
}

async function fetchWithTimeout(pathname) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(`${BASE_URL}${pathname}`, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/json' },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function waitUntilReady() {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS
  let lastError = ''
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`Next.js exited before becoming ready (exit ${child.exitCode}).`)
    }
    try {
      const response = await fetchWithTimeout('/api/health')
      if (response.status === 200) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Next.js did not become ready within ${STARTUP_TIMEOUT_MS}ms (${lastError}).`)
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
    name: 'homepage',
    path: '/',
    statuses: [200],
    validate: async (response) => {
      const html = await response.text()
      if (!html.includes('ShopSIN')) return 'homepage does not contain the ShopSIN identity'
      if (html.includes('Simone Shop')) return 'homepage contains the legacy Simone Shop identity'
      return ''
    },
  },
  { name: 'impressum', path: '/impressum', statuses: [200] },
  { name: 'privacy', path: '/datenschutz', statuses: [200] },
  { name: 'withdrawal', path: '/widerrufsrecht', statuses: [200] },
  {
    name: 'database readiness',
    path: '/api/healthz',
    statuses: REQUIRE_HEALTHY_API ? [200] : [200, 503],
  },
]

try {
  await waitUntilReady()
  let failed = 0

  for (const check of checks) {
    try {
      const response = await fetchWithTimeout(check.path)
      if (!check.statuses.includes(response.status)) {
        failed += 1
        console.error(`FAIL ${check.name}: ${check.path} returned HTTP ${response.status}`)
        continue
      }
      const validationError = check.validate ? await check.validate(response.clone()) : ''
      if (validationError) {
        failed += 1
        console.error(`FAIL ${check.name}: ${validationError}`)
        continue
      }
      const degraded = response.status === 503 ? ' (allowed degraded dependency state)' : ''
      console.log(`PASS ${check.name}: HTTP ${response.status}${degraded}`)
    } catch (error) {
      failed += 1
      console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (failed > 0) throw new Error(`Web runtime check failed (${failed}/${checks.length}).`)
  console.log(`Web runtime check passed (${checks.length}/${checks.length}).`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  const serverOutput = output.join('').trim()
  if (serverOutput) console.error(serverOutput)
  process.exitCode = 1
} finally {
  stopServer()
}
