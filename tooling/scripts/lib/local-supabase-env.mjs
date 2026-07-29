import { spawnSync } from 'node:child_process'

function requireString(payload, key) {
  const value = String(payload?.[key] || '').trim()
  if (!value) {
    throw new Error(`Local Supabase status is missing ${key}.`)
  }
  return value
}

export function normalizeLocalSupabaseStatus(payload) {
  const apiUrl = requireString(payload, 'API_URL')
  const anonKey = requireString(payload, 'ANON_KEY')
  const serviceRoleKey = requireString(payload, 'SERVICE_ROLE_KEY')
  const databaseUrl = requireString(payload, 'DB_URL')

  let parsedApiUrl
  try {
    parsedApiUrl = new URL(apiUrl)
  } catch {
    throw new Error('Local Supabase status contains an invalid API_URL.')
  }
  if (!['http:', 'https:'].includes(parsedApiUrl.protocol)) {
    throw new Error('Local Supabase API_URL must use HTTP or HTTPS.')
  }

  let parsedDatabaseUrl
  try {
    parsedDatabaseUrl = new URL(databaseUrl)
  } catch {
    throw new Error('Local Supabase status contains an invalid DB_URL.')
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('Local Supabase DB_URL must use PostgreSQL.')
  }

  return {
    apiUrl,
    anonKey,
    serviceRoleKey,
    databaseUrl,
  }
}

export function readLocalSupabaseStatus({ cwd = process.cwd(), env = process.env } = {}) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'supabase', 'status', '--workdir', 'platform/infra', '-o', 'json'],
    { cwd, env, encoding: 'utf8' },
  )

  if (result.status !== 0) {
    throw new Error('Local Supabase is unavailable. Start it with pnpm db:local:start.')
  }

  let payload
  try {
    payload = JSON.parse(result.stdout)
  } catch {
    throw new Error('Local Supabase returned invalid status JSON.')
  }

  return normalizeLocalSupabaseStatus(payload)
}
