import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

function testDatabaseUrl(): string | null {
  const value = process.env.E2E_TEST_DATABASE_URL?.trim()
  if (!value && process.env.E2E_SKIP_SEED === 'true') return null
  if (!value) throw new Error('E2E_TEST_DATABASE_URL is required unless E2E_SKIP_SEED=true')

  const host = new URL(value).hostname
  const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1'
  if (!isLoopback && process.env.ALLOW_DESTRUCTIVE_E2E_TESTS !== 'true') {
    throw new Error('Remote E2E seed/cleanup requires ALLOW_DESTRUCTIVE_E2E_TESTS=true')
  }
  return value
}

export async function applyFixture(action: 'seed' | 'cleanup'): Promise<void> {
  const connectionString = testDatabaseUrl()
  if (!connectionString) return

  const sql = await readFile(resolve(`tooling/tests/e2e/fixtures/${action}.sql`), 'utf8')
  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    await client.query('begin')
    await client.query(sql)
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    await client.end()
  }
}
