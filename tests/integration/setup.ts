// Purpose: Vitest setup — mock 'server-only' (Next.js guard) als no-op,
// damit app/lib/supabase/admin in Tests importierbar ist.
// Setzt Supabase-Env aus .env.local falls vorhanden.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ENV aus .env.local laden (oder .env.production für CI)
const envFile = existsSync('.env.local') ? '.env.local' : '.env.production'
if (existsSync(envFile)) {
  const content = readFileSync(resolve(envFile), 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

// Fallback: hardcoded DB-Werte für Integration-Tests
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.delqhi.com:8006'
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // Service-Role-Key wird via Infisical export gesetzt
  // Fallback ist nur für lokale Tests
  console.warn('[vitest] SUPABASE_SERVICE_ROLE_KEY missing — set via .env.local or infisical export')
}
