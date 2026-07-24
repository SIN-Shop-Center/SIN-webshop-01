#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const env = { ...process.env }
const externalBaseUrl = Boolean(env.E2E_BASE_URL)

if (!externalBaseUrl) {
  const status = spawnSync(
    'pnpm',
    ['exec', 'supabase', 'status', '--workdir', 'platform/infra', '-o', 'json'],
    { encoding: 'utf8' },
  )
  if (status.status !== 0) {
    process.stderr.write(status.stderr)
    console.error('Start the isolated test database first with pnpm db:local:start.')
    process.exit(status.status ?? 1)
  }

  const local = JSON.parse(status.stdout)
  env.NEXT_PUBLIC_SUPABASE_URL = local.API_URL
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = local.ANON_KEY
  env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY
  env.E2E_TEST_DATABASE_URL = local.DB_URL
  env.NEXT_PUBLIC_APP_URL = `http://127.0.0.1:${env.E2E_PORT || '4173'}`
  env.STRIPE_SECRET_KEY ||= 'sk_test_e2e_invalid'
  env.STRIPE_WEBHOOK_SECRET ||= 'whsec_e2e_invalid'
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
