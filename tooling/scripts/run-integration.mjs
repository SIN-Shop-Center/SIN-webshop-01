#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const env = { ...process.env }
const hasExplicitTestDatabase = Boolean(
  env.TEST_SUPABASE_URL && env.TEST_SUPABASE_SERVICE_ROLE_KEY,
)

if (!hasExplicitTestDatabase) {
  const status = spawnSync(
    'pnpm',
    ['exec', 'supabase', 'status', '--workdir', 'platform/infra', '-o', 'json'],
    { encoding: 'utf8' },
  )
  if (status.status !== 0) {
    process.stderr.write(status.stderr)
    console.error('Integration tests require pnpm db:local:start or explicit TEST_SUPABASE_* values.')
    process.exit(status.status ?? 1)
  }
  const local = JSON.parse(status.stdout)
  env.TEST_SUPABASE_URL = local.API_URL
  env.TEST_SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY
}

env.ALLOW_DESTRUCTIVE_INTEGRATION_TESTS = 'true'
const tests = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', 'tooling/tests/integration', ...process.argv.slice(2).filter((arg) => arg !== '--')],
  { env, stdio: 'inherit' },
)
process.exit(tests.status ?? 1)
