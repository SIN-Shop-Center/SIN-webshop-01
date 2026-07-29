#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const MIGRATIONS_DIR = path.resolve('platform/infra/supabase/migrations')
const NAME_RE = /^(\d{14})_(.+)\.sql$/

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.error(`Migrations directory missing: ${MIGRATIONS_DIR}`)
  process.exit(1)
}

const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
if (files.length === 0) {
  console.error('No SQL migrations found.')
  process.exit(1)
}

const errors = []
const ids = new Set()
let prev = ''

for (const file of files) {
  const m = file.match(NAME_RE)
  if (!m) {
    errors.push(`Invalid migration filename: ${file}`)
    continue
  }
  const id = m[1]
  if (ids.has(id)) {
    errors.push(`Duplicate migration id: ${id}`)
  }
  ids.add(id)
  if (prev && id <= prev) {
    errors.push(`Migration order not strictly increasing: ${prev} then ${id}`)
  }
  prev = id
}

if (errors.length > 0) {
  console.error('Migration audit failed:')
  for (const err of errors) {
    console.error(`- ${err}`)
  }
  process.exit(1)
}

console.log(`Migration audit passed (${files.length} files).`)
console.log(`Latest migration: ${files[files.length - 1]}`)
