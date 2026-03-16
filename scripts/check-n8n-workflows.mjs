#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflowsDir = join(root, 'workers', 'n8n', 'simone', 'workflows')
const entries = readdirSync(workflowsDir).filter((name) => name.endsWith('.json'))

if (entries.length === 0) {
  console.error(`No workflow JSON files found in ${workflowsDir}`)
  process.exit(1)
}

const failures = []
for (const name of entries) {
  const fullPath = join(workflowsDir, name)
  try {
    const parsed = JSON.parse(readFileSync(fullPath, 'utf8'))
    if (typeof parsed.name !== 'string' || parsed.name.trim() === '') {
      failures.push(`${name}: missing non-empty \"name\"`)
    }
    if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      failures.push(`${name}: missing non-empty \"nodes\" array`)
    }
    if (typeof parsed.connections !== 'object' || parsed.connections === null) {
      failures.push(`${name}: missing \"connections\" object`)
    }
  } catch (error) {
    failures.push(`${name}: invalid JSON (${error instanceof Error ? error.message : String(error)})`)
  }
}

if (failures.length > 0) {
  console.error(`n8n workflow validation failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`n8n workflow validation passed (${entries.length} workflow files).`)
