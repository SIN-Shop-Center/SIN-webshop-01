#!/usr/bin/env node
/**
 * Non-secret readiness check for the ShopSIN commerce control plane.
 * Prints only presence/status, never secret values.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { loadLocalEnvFiles } from '../lib/cli-env.mjs'

loadLocalEnvFiles()

const ROOT = process.cwd()
const OPENMONTAGE_ROOT = path.resolve(
  process.env.OPENMONTAGE_ROOT || '/Users/jeremy/dev/OpenMontage',
)

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CJ_EMAIL',
  'CJ_API_KEY',
  'NEXT_PUBLIC_APP_URL',
  'CRON_SECRET',
]

const ONE_OF_ENV = [
  ['OPENAI_API_KEY', 'PRODUCT_RESEARCH_ENDPOINT'],
]

const OPTIONAL_ENV = [
  'TIKTOK_APP_KEY',
  'TIKTOK_APP_SECRET',
  'TIKTOK_SHOP_ID',
  'TIKTOK_ACCESS_TOKEN',
  'TIKTOK_CONTENT_USER_ACCESS_TOKEN',
  'TREND_SOURCE_ENDPOINTS_JSON',
  'TREND_BROWSER_OUTPUT',
  'OPENMONTAGE_AGENT_COMMAND_JSON',
]

const REQUIRED_FILES = [
  'platform/infra/supabase/migrations/20260722000000_commerce_control_plane.sql',
  'tooling/scripts/pipeline/commerce-worker.mjs',
  'tooling/scripts/pipeline/trend-intelligence.mjs',
  'tooling/scripts/pipeline/select-top-cj-products.mjs',
  'tooling/scripts/pipeline/enrich-products.mjs',
  'tooling/scripts/pipeline/openmontage-shop-bridge.mjs',
  'tooling/scripts/pipeline/publish-approved-products.mjs',
  'tooling/scripts/pipeline/prepare-social-drafts.mjs',
  'tooling/scripts/pipeline/upload-approved-tiktok-videos.mjs',
  'platform/deploy/openmontage/run-product-ugc-codex.sh',
]

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function commandStatus(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 10_000,
    env: process.env,
  })
  return {
    available: !result.error && result.status === 0,
    exitCode: result.status,
    version: result.status === 0
      ? String(result.stdout || result.stderr || '').trim().split('\n')[0].slice(0, 160)
      : null,
  }
}

function envPresent(name) {
  return Boolean(String(process.env[name] || '').trim())
}

async function main() {
  const requiredFiles = {}
  for (const relative of REQUIRED_FILES) {
    requiredFiles[relative] = await exists(path.join(ROOT, relative))
  }

  const openMontageFiles = {
    root: await exists(OPENMONTAGE_ROOT),
    guide: await exists(path.join(OPENMONTAGE_ROOT, 'AGENT_GUIDE.md')),
    pipeline: await exists(path.join(OPENMONTAGE_ROOT, 'pipeline_defs', 'product-ugc.yaml')),
    checkpointRuntime: await exists(path.join(OPENMONTAGE_ROOT, 'lib', 'checkpoint.py')),
  }

  const requiredEnv = Object.fromEntries(
    REQUIRED_ENV.map((name) => [name, envPresent(name)]),
  )
  const oneOfEnv = ONE_OF_ENV.map((group) => ({
    alternatives: group,
    satisfied: group.some(envPresent),
  }))
  const optionalEnv = Object.fromEntries(
    OPTIONAL_ENV.map((name) => [name, envPresent(name)]),
  )

  const commands = {
    node: commandStatus('node'),
    pnpm: commandStatus('pnpm'),
    python3: commandStatus('python3'),
    codex: commandStatus('codex'),
    supabase: commandStatus('supabase'),
    ffmpeg: commandStatus('ffmpeg', ['-version']),
    ffprobe: commandStatus('ffprobe', ['-version']),
    orca: commandStatus('orca', ['--version']),
  }

  const safetyDefaults = {
    tiktokShopDraftMode: (process.env.TIKTOK_SAVE_MODE || 'AS_DRAFT') === 'AS_DRAFT',
    tiktokContentUploadDisabled:
      String(process.env.TIKTOK_CONTENT_UPLOAD_ENABLED || 'false').toLowerCase() !== 'true',
    euStockRequiredByDefault: true,
    automaticSocialEngagementDisabled: true,
  }

  const blocking = []
  for (const [name, present] of Object.entries(requiredEnv)) {
    if (!present) blocking.push(`Missing environment variable: ${name}`)
  }
  for (const group of oneOfEnv) {
    if (!group.satisfied) blocking.push(`Configure one of: ${group.alternatives.join(', ')}`)
  }
  for (const [relative, present] of Object.entries(requiredFiles)) {
    if (!present) blocking.push(`Missing file: ${relative}`)
  }
  for (const [name, present] of Object.entries(openMontageFiles)) {
    if (!present) blocking.push(`OpenMontage check failed: ${name}`)
  }
  for (const command of ['node', 'pnpm', 'python3', 'codex', 'ffmpeg', 'ffprobe']) {
    if (!commands[command].available) blocking.push(`Missing command: ${command}`)
  }

  const warnings = []
  if (!commands.supabase.available) warnings.push('Supabase CLI unavailable; migrations cannot be pushed from this shell.')
  if (!commands.orca.available) warnings.push('Orca unavailable; OpenMontage wrapper may require an explicit override if configured to enforce Orca.')
  if (!optionalEnv.TIKTOK_APP_KEY || !optionalEnv.TIKTOK_APP_SECRET || !optionalEnv.TIKTOK_SHOP_ID) {
    warnings.push('TikTok Shop is not fully configured.')
  }
  if (String(process.env.TIKTOK_CONTENT_UPLOAD_ENABLED || '').toLowerCase() === 'true' && !optionalEnv.TIKTOK_CONTENT_USER_ACCESS_TOKEN) {
    blocking.push('TikTok content upload is enabled but the user access token is missing.')
  }
  if (!optionalEnv.TREND_BROWSER_OUTPUT && !optionalEnv.TREND_SOURCE_ENDPOINTS_JSON) {
    warnings.push('Only Google Trends RSS is configured; TikTok/marketplace browser evidence is not connected yet.')
  }

  const report = {
    checkedAt: new Date().toISOString(),
    projectRoot: ROOT,
    openMontageRoot: OPENMONTAGE_ROOT,
    ready: blocking.length === 0,
    blocking,
    warnings,
    requiredEnv,
    oneOfEnv,
    optionalEnv,
    requiredFiles,
    openMontageFiles,
    commands,
    safetyDefaults,
  }

  console.log(JSON.stringify(report, null, 2))
  if (blocking.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(JSON.stringify({ ready: false, fatal: error.message }, null, 2))
  process.exit(1)
})
