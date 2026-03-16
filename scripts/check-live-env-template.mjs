#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REQUIRED_TEMPLATE_KEYS } from './live-env-schema.mjs'

const ROOT = process.cwd()
const templatePath = join(ROOT, '.env.live.example')

let content = ''
try {
  content = readFileSync(templatePath, 'utf8')
} catch (error) {
  console.error(`Failed to read template file: ${templatePath}`)
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const presentKeys = new Set(
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.slice(0, line.indexOf('=')).trim()),
)

const missing = REQUIRED_TEMPLATE_KEYS.filter((key) => !presentKeys.has(key))
if (missing.length > 0) {
  console.error(`.env.live.example is missing ${missing.length} required key(s):`)
  for (const key of missing) {
    console.error(`- ${key}`)
  }
  process.exit(1)
}

console.log(`Live env template check passed (${REQUIRED_TEMPLATE_KEYS.length} required keys present).`)
