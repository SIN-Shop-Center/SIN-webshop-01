#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

import pg from 'pg'

const { Client } = pg
const ROOT = process.cwd()
const MIGRATIONS_DIR = resolve(ROOT, 'platform/infra/supabase/migrations')
const STATUS_ONLY = process.argv.includes('--status')
const BASELINE = process.argv.includes('--baseline')
const NAME_RE = /^(\d{14})_(.+)\.sql$/
const LOCK_NAME = 'shopsin_schema_migrations_v1'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const connectionString = String(process.env.DATABASE_URL || '').trim()
if (!connectionString) fail('DATABASE_URL is required. The value is never printed.')
if (!existsSync(MIGRATIONS_DIR)) fail(`Migrations directory is missing: ${MIGRATIONS_DIR}`)
if (STATUS_ONLY && BASELINE) fail('Use either --status or --baseline, not both.')

function checksum(content) {
  return createHash('sha256').update(content).digest('hex')
}

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => {
    const match = file.match(NAME_RE)
    if (!match) fail(`Invalid migration filename: ${file}`)
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8')
    return {
      file,
      version: match[1],
      name: match[2],
      sql,
      digest: checksum(sql),
    }
  })

if (migrations.length === 0) fail('No SQL migrations found.')

function clientOptions() {
  const options = { connectionString, application_name: 'shopsin-db-migrate' }
  const sslMode = String(process.env.PGSSLMODE || '').toLowerCase()
  if (sslMode === 'disable') return { ...options, ssl: false }
  if (sslMode === 'require' || sslMode === 'prefer') {
    return { ...options, ssl: { rejectUnauthorized: false } }
  }
  if (sslMode === 'verify-ca' || sslMode === 'verify-full') {
    return { ...options, ssl: { rejectUnauthorized: true } }
  }
  return options
}

function verifyAppliedChecksums(applied, candidates = migrations) {
  for (const migration of candidates) {
    const existing = applied.get(migration.version)
    if (existing && existing.checksum_sha256 !== migration.digest) {
      throw new Error(
        `Migration checksum mismatch for ${migration.file}. Applied migrations are immutable; create a new migration instead.`,
      )
    }
  }
}

const client = new Client(clientOptions())

try {
  await client.connect()
  await client.query('select pg_advisory_lock(hashtext($1))', [LOCK_NAME])
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      name text not null,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now()
    )
  `)

  const appliedResult = await client.query(
    'select version, name, checksum_sha256, applied_at from public.schema_migrations order by version',
  )
  const applied = new Map(appliedResult.rows.map((row) => [row.version, row]))
  verifyAppliedChecksums(applied)

  if (BASELINE) {
    const allowed = process.env.ALLOW_MIGRATION_BASELINE === 'true'
    const baselineThrough = String(process.env.MIGRATION_BASELINE_THROUGH || '').trim()
    if (!allowed) {
      throw new Error('Baseline refused: set ALLOW_MIGRATION_BASELINE=true after verifying the existing schema.')
    }
    if (!/^\d{14}$/.test(baselineThrough)) {
      throw new Error('MIGRATION_BASELINE_THROUGH must be an explicit 14-digit migration version.')
    }

    const candidates = migrations.filter((migration) => migration.version <= baselineThrough)
    if (candidates.length === 0 || candidates.at(-1)?.version !== baselineThrough) {
      throw new Error(`Baseline target does not match an existing migration: ${baselineThrough}`)
    }

    await client.query('begin')
    try {
      for (const migration of candidates) {
        await client.query(
          `insert into public.schema_migrations (version, name, checksum_sha256)
           values ($1, $2, $3)
           on conflict (version) do nothing`,
          [migration.version, migration.name, migration.digest],
        )
      }
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    }
    console.log(
      `Baselined ${candidates.length} migration${candidates.length === 1 ? '' : 's'} through ${baselineThrough}.`,
    )
    console.log('Run pnpm db:migrate next to apply newer migrations normally.')
  } else {
    const pending = migrations.filter((migration) => !applied.has(migration.version))

    if (STATUS_ONLY) {
      console.log(`Applied migrations: ${applied.size}`)
      console.log(`Pending migrations: ${pending.length}`)
      for (const migration of pending) console.log(`- ${migration.file}`)
      process.exitCode = pending.length > 0 ? 2 : 0
    } else if (pending.length === 0) {
      console.log(`Database is current (${applied.size} migrations applied).`)
    } else {
      for (const migration of pending) {
        console.log(`Applying ${migration.file}`)
        await client.query('begin')
        try {
          await client.query("set local lock_timeout = '15s'")
          await client.query("set local statement_timeout = '10min'")
          await client.query(migration.sql)
          await client.query(
            `insert into public.schema_migrations (version, name, checksum_sha256)
             values ($1, $2, $3)`,
            [migration.version, migration.name, migration.digest],
          )
          await client.query('commit')
        } catch (error) {
          await client.query('rollback')
          throw new Error(
            `Migration ${migration.file} failed: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
      console.log(`Applied ${pending.length} migration${pending.length === 1 ? '' : 's'} successfully.`)
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  try {
    await client.query('select pg_advisory_unlock(hashtext($1))', [LOCK_NAME])
  } catch {
    // PostgreSQL releases session-scoped locks when the connection closes.
  }
  await client.end().catch(() => {})
}
