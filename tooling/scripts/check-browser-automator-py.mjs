#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const registryPath = join(root, 'platform', 'agents', 'sin-a2a', 'registry.json')
const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
const agent = registry.agents?.find((entry) => entry.id === 'sin-shop-logistic')

if (!agent) {
  process.stderr.write('check-browser-automator-py: sin-shop-logistic is missing from the registry\n')
  process.exit(1)
}

const runtimePath = String(agent.paths?.a2aRuntime || '')
const dir = join(root, runtimePath, 'browser-automator')

if (agent.status !== 'active' || agent.repo?.status !== 'active') {
  if (existsSync(dir)) {
    process.stderr.write(
      `check-browser-automator-py: ${agent.id} is ${agent.status}/${agent.repo?.status}, but runtime code exists at ${runtimePath}\n`,
    )
    process.exit(1)
  }
  process.stdout.write(
    `check-browser-automator-py: ${agent.id} correctly marked ${agent.status}/${agent.repo?.status}; no runtime validated\n`,
  )
  process.exit(0)
}

if (!existsSync(dir)) {
  process.stderr.write(
    `check-browser-automator-py: active registry entry points to missing directory ${runtimePath}/browser-automator\n`,
  )
  process.exit(1)
}

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
