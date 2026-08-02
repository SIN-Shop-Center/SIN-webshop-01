import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLocalSupabaseStatus } from './local-supabase-env.mjs'

const validStatus = {
  API_URL: 'http://127.0.0.1:54321',
  ANON_KEY: 'local-anon-test-value',
  SERVICE_ROLE_KEY: 'local-service-role-test-value',
  DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
}

test('normalizeLocalSupabaseStatus maps the required local runtime fields', () => {
  assert.deepEqual(normalizeLocalSupabaseStatus(validStatus), {
    apiUrl: validStatus.API_URL,
    anonKey: validStatus.ANON_KEY,
    serviceRoleKey: validStatus.SERVICE_ROLE_KEY,
    databaseUrl: validStatus.DB_URL,
  })
})

test('normalizeLocalSupabaseStatus rejects incomplete status without echoing values', () => {
  assert.throws(
    () => normalizeLocalSupabaseStatus({ ...validStatus, SERVICE_ROLE_KEY: '' }),
    /^Error: Local Supabase status is missing SERVICE_ROLE_KEY\.$/,
  )
})

test('normalizeLocalSupabaseStatus rejects unsafe protocols', () => {
  assert.throws(
    () => normalizeLocalSupabaseStatus({ ...validStatus, API_URL: 'file:///tmp/supabase' }),
    /API_URL must use HTTP or HTTPS/,
  )
  assert.throws(
    () => normalizeLocalSupabaseStatus({ ...validStatus, DB_URL: 'https://127.0.0.1/database' }),
    /DB_URL must use PostgreSQL/,
  )
})
