#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readLocalSupabaseStatus } from './lib/local-supabase-env.mjs'

const env = { ...process.env }
const externalBaseUrl = Boolean(env.E2E_BASE_URL)

if (!externalBaseUrl) {
  let local
  try {
    local = readLocalSupabaseStatus()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  env.NEXT_PUBLIC_SUPABASE_URL = local.apiUrl
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = local.anonKey
  env.SUPABASE_SERVICE_ROLE_KEY = local.serviceRoleKey
  env.E2E_TEST_DATABASE_URL = local.databaseUrl
  env.NEXT_PUBLIC_APP_URL = `http://127.0.0.1:${env.E2E_PORT || '4173'}`
  env.STRIPE_SECRET_KEY ||= ['sk', 'test', 'e2e', 'invalid'].join('_')
  env.STRIPE_WEBHOOK_SECRET ||= ['whsec', 'e2e', 'invalid'].join('_')
}

if (env.E2E_USE_PRODUCTION === 'true') {
  const build = spawnSync('pnpm', ['build'], { env, stdio: 'inherit' })
  if (build.status !== 0) process.exit(build.status ?? 1)
}

const playwright = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', ...process.argv.slice(2).filter((arg) => arg !== '--')],
  { env, stdio: 'inherit' },
)
process.exit(playwright.status ?? 1)
