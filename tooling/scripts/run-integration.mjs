#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readLocalSupabaseStatus } from './lib/local-supabase-env.mjs'

const env = { ...process.env }
const hasExplicitTestDatabase = Boolean(
  env.TEST_SUPABASE_URL && env.TEST_SUPABASE_SERVICE_ROLE_KEY,
)

if (!hasExplicitTestDatabase) {
  let local
  try {
    local = readLocalSupabaseStatus()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
  env.TEST_SUPABASE_URL = local.apiUrl
  env.TEST_SUPABASE_SERVICE_ROLE_KEY = local.serviceRoleKey
}

env.ALLOW_DESTRUCTIVE_INTEGRATION_TESTS = 'true'
const tests = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', 'tooling/tests/integration', ...process.argv.slice(2).filter((arg) => arg !== '--')],
  { env, stdio: 'inherit' },
)
process.exit(tests.status ?? 1)
