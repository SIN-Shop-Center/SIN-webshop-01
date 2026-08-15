#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import AxeBuilder from '@axe-core/playwright'
import { chromium } from '@playwright/test'

const PORT = Number(process.env.PERFORMANCE_PORT || 3000)
const BASE_URL = `http://127.0.0.1:${PORT}`
const REPORT_DIR = 'test-results/performance-budget'
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/suche?q=test' },
  { name: 'cart', path: '/warenkorb' },
]

const HARD_LIMITS = {
  lcpMs: 2500,
  cls: 0.1,
  tbtMs: 300,
}
const WARN_LIMITS = {
  totalBytes: 1_500_000,
}

function startServer() {
  return spawn('pnpm', ['start', '--hostname', '127.0.0.1', '--port', String(PORT)], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  })
}

async function terminateServer(server) {
  if (server.exitCode !== null) return

  const signal = (name) => {
    try {
      if (process.platform !== 'win32' && server.pid) process.kill(-server.pid, name)
      else server.kill(name)
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error
    }
  }

  signal('SIGTERM')
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (server.exitCode !== null) return
    await delay(100)
  }
  signal('SIGKILL')
}

async function waitForServer(server) {
  let lastError = ''
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`production_server_exited:${server.exitCode}`)
    }
    try {
      const response = await fetch(`${BASE_URL}/api/health`)
      if (response.ok) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await delay(500)
  }
  throw new Error(`production_server_not_ready:${lastError}`)
}

async function inspectPage(browser, entry) {
  const context = await browser.newContext()
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.addInitScript(() => {
    window.__shopsinPerformanceBudget = { lcp: 0, cls: 0, longTasks: [] }
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) window.__shopsinPerformanceBudget.lcp = last.startTime
      }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const item of list.getEntries()) {
          if (!item.hadRecentInput) window.__shopsinPerformanceBudget.cls += item.value
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const item of list.getEntries()) {
          window.__shopsinPerformanceBudget.longTasks.push(item.duration)
        }
      }).observe({ type: 'longtask', buffered: true })
    } catch {}
  })

  const response = await page.goto(`${BASE_URL}${entry.path}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  })
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve())
  await delay(750)

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const seriousA11y = axe.violations.filter(
    (item) => item.impact === 'critical' || item.impact === 'serious',
  )

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    const budget = window.__shopsinPerformanceBudget || { lcp: 0, cls: 0, longTasks: [] }
    const totalBytes = [nav, ...resources].reduce(
      (sum, item) => sum + (Number(item?.transferSize) || 0),
      0,
    )
    const tbtMs = budget.longTasks.reduce(
      (sum, duration) => sum + Math.max(0, Number(duration) - 50),
      0,
    )
    return {
      lcpMs: Math.round(Number(budget.lcp) || 0),
      cls: Number(Number(budget.cls || 0).toFixed(4)),
      tbtMs: Math.round(tbtMs),
      totalBytes: Math.round(totalBytes),
      title: document.title.trim(),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '',
      lang: document.documentElement.lang.trim(),
    }
  })

  const failures = []
  const warnings = []
  const status = response?.status() ?? 0
  if (status < 200 || status >= 400) failures.push(`http_status:${status}`)
  if (metrics.lcpMs <= 0 || metrics.lcpMs > HARD_LIMITS.lcpMs) failures.push(`lcp_ms:${metrics.lcpMs}`)
  if (metrics.cls > HARD_LIMITS.cls) failures.push(`cls:${metrics.cls}`)
  if (metrics.tbtMs > HARD_LIMITS.tbtMs) failures.push(`tbt_ms:${metrics.tbtMs}`)
  if (metrics.totalBytes > WARN_LIMITS.totalBytes) warnings.push(`total_bytes:${metrics.totalBytes}`)
  if (!metrics.title) failures.push('seo_missing_title')
  if (!metrics.description) failures.push('seo_missing_description')
  if (!metrics.lang) failures.push('seo_missing_html_lang')
  if (seriousA11y.length > 0) failures.push(`a11y_serious_or_critical:${seriousA11y.length}`)
  if (pageErrors.length > 0) failures.push(`page_errors:${pageErrors.length}`)

  const result = {
    ...entry,
    url: `${BASE_URL}${entry.path}`,
    status,
    metrics,
    accessibility: seriousA11y.map((item) => ({ id: item.id, impact: item.impact, help: item.help })),
    pageErrors,
    consoleErrorCount: consoleErrors.length,
    failures,
    warnings,
  }
  await context.close()
  return result
}

const server = startServer()
let serverStderr = ''
server.stderr.on('data', (chunk) => {
  serverStderr = `${serverStderr}${chunk}`.slice(-4000)
})

let browser
try {
  await waitForServer(server)
  browser = await chromium.launch({ headless: true })
  const results = []
  for (const entry of PAGES) results.push(await inspectPage(browser, entry))
  await mkdir(REPORT_DIR, { recursive: true })
  await writeFile(
    `${REPORT_DIR}/results.json`,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), limits: { hard: HARD_LIMITS, warn: WARN_LIMITS }, results }, null, 2)}\n`,
  )

  let failed = false
  for (const result of results) {
    const summary = `${result.name}: HTTP ${result.status}, LCP ${result.metrics.lcpMs}ms, CLS ${result.metrics.cls}, TBT ${result.metrics.tbtMs}ms, ${(result.metrics.totalBytes / 1024).toFixed(1)} KiB`
    console.log(summary)
    for (const warning of result.warnings) console.warn(`WARN ${result.name}: ${warning}`)
    for (const failure of result.failures) {
      failed = true
      console.error(`FAIL ${result.name}: ${failure}`)
    }
  }
  if (failed) process.exitCode = 1
  else console.log(`Performance budget passed (${results.length}/${results.length} pages).`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  if (serverStderr.trim()) console.error(serverStderr.trim())
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  await terminateServer(server)
}
