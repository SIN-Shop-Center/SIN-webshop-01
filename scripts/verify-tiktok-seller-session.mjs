#!/usr/bin/env node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const CHROME_ROOT = path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
const CHROME_EXECUTABLE = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const SELLER_URL = 'https://seller-de.tiktok.com/homepage?shop_region=DE'

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const profiles = args.all ? detectSellerProfiles() : [args.profile]

  if (!fs.existsSync(CHROME_EXECUTABLE)) {
    throw new Error(`chrome_executable_missing:${CHROME_EXECUTABLE}`)
  }
  if (!fs.existsSync(CHROME_ROOT)) {
    throw new Error(`chrome_root_missing:${CHROME_ROOT}`)
  }
  if (profiles.length === 0) {
    throw new Error('no_seller_profiles_detected')
  }

  const results = []
  for (const profile of profiles) {
    results.push(await verifyProfile(profile))
  }

  process.stdout.write(`${JSON.stringify({ checked_at: new Date().toISOString(), seller_url: SELLER_URL, results }, null, 2)}\n`)
}

function parseArgs(argv) {
  let profile = 'Profile 73'
  let all = false
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (current === '--profile' && argv[index + 1]) {
      profile = argv[index + 1]
      index += 1
      continue
    }
    if (current === '--all') {
      all = true
    }
  }
  return { profile, all }
}

function detectSellerProfiles() {
  const out = []
  for (const entry of fs.readdirSync(CHROME_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const historyPath = path.join(CHROME_ROOT, entry.name, 'History')
    if (!fs.existsSync(historyPath)) {
      continue
    }
    if (historyHasSellerUrls(historyPath)) {
      out.push(entry.name)
    }
  }
  return out
}

function historyHasSellerUrls(historyPath) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-history-'))
  const tempHistory = path.join(tempDir, 'History')
  try {
    fs.copyFileSync(historyPath, tempHistory)
    const output = execFileSync('sqlite3', [
      tempHistory,
      "select count(*) from urls where url like '%seller-de.tiktok.com%' or url like '%seller-de-accounts.tiktok.com%';",
    ], { encoding: 'utf8' }).trim()
    return Number(output || '0') > 0
  } catch {
    return false
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

async function verifyProfile(profileName) {
  const sourceProfile = path.join(CHROME_ROOT, profileName)
  if (!fs.existsSync(sourceProfile)) {
    throw new Error(`chrome_profile_missing:${profileName}`)
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-chrome-copy-'))
  const destinationRoot = path.join(tempRoot, 'Chrome')
  const destinationProfile = path.join(destinationRoot, profileName)
  fs.mkdirSync(destinationRoot, { recursive: true })
  fs.copyFileSync(path.join(CHROME_ROOT, 'Local State'), path.join(destinationRoot, 'Local State'))

  execFileSync('rsync', [
    '-a',
    '--delete',
    '--exclude=Cache',
    '--exclude=Code Cache',
    '--exclude=GPUCache',
    '--exclude=ShaderCache',
    '--exclude=GrShaderCache',
    '--exclude=GraphiteDawnCache',
    '--exclude=Dawn*Cache',
    `${sourceProfile}/`,
    `${destinationProfile}/`,
  ])

  const { chromium } = await import('playwright-core')
  const context = await chromium.launchPersistentContext(destinationRoot, {
    executablePath: CHROME_EXECUTABLE,
    headless: true,
    args: [`--profile-directory=${profileName}`, '--no-first-run', '--no-default-browser-check'],
    timeout: 30_000,
  })

  try {
    const page = context.pages()[0] || await context.newPage()
    await page.goto(SELLER_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForTimeout(5_000)

    const bodyText = ((await page.textContent('body').catch(() => '')) || '').replace(/\s+/g, ' ').trim()
    const cookieNames = (await context.cookies())
      .filter((cookie) => cookie.domain.includes('tiktok'))
      .map((cookie) => `${cookie.domain}:${cookie.name}`)
      .slice(0, 25)

    return {
      profile: profileName,
      final_url: page.url(),
      title: await page.title(),
      state: classifyState(page.url(), bodyText),
      body_excerpt: bodyText.slice(0, 600),
      tiktok_cookies: cookieNames,
    }
  } finally {
    await context.close().catch(() => undefined)
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
}

function classifyState(finalUrl, bodyText) {
  const normalizedBody = bodyText.toLowerCase()
  const normalizedUrl = String(finalUrl || '').toLowerCase()
  if (normalizedBody.includes('dieses konto wurde gesperrt')) {
    return 'blocked_account'
  }
  if (normalizedUrl.includes('/account/login')) {
    return 'login_required'
  }
  if (normalizedUrl.includes('seller-de.tiktok.com/homepage') || normalizedUrl.includes('seller-de.tiktok.com/settle/verification')) {
    return 'seller_center_reached'
  }
  return 'unknown'
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
