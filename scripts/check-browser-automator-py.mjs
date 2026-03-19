#!/usr/bin/env node

import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', 'a2a', 'team-shop', 'sin-shop-logistic', 'browser-automator')

const files = readdirSync(dir)
  .filter((name) => name.endsWith('.py'))
  .sort()
  .map((name) => join(dir, name))

if (files.length === 0) {
  process.stderr.write('check-browser-automator-py: no .py files found\n')
  process.exit(1)
}

let failed = 0

for (const file of files) {
  const result = spawnSync('python3', ['-m', 'py_compile', file], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.stderr.write(`FAIL: ${file}\n`)
    failed += 1
  }
}

if (failed > 0) {
  process.stderr.write(`check-browser-automator-py: ${failed} file(s) have syntax errors\n`)
  process.exit(1)
}

process.stdout.write(`check-browser-automator-py: ${files.length} file(s) OK\n`)
