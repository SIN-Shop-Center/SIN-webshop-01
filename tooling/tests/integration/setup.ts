// Purpose: Vitest setup for integration tests.
// Production credentials are never inferred. Destructive DB tests require
// explicit TEST_* credentials plus an opt-in flag in the individual suite.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

const envFile = existsSync('.env.test.local') ? '.env.test.local' : null
if (envFile) {
  const content = readFileSync(resolve(envFile), 'utf-8')
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}

if (process.env.TEST_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.TEST_SUPABASE_URL
}
if (process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
}

// Safe non-routable defaults let non-DB integration suites import server code.
// Any suite that actually contacts Supabase must opt in and validate TEST_*.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://integration-tests-disabled.invalid'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'integration-tests-disabled'
