#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const ALLOWED_ROOT_DIRECTORIES = new Set([
  'docs',
  'packages',
  'platform',
  'public',
  'src',
  'tooling',
])
const GENERATED_ROOT_DIRECTORIES = new Set([
  'coverage',
  'graphify-out',
  'playwright-report',
  'test-results',
])
const REQUIRED_PATHS = [
  'src/app',
  'src/actions',
  'src/components',
  'src/config',
  'src/lib',
  'packages',
  'platform/agents',
  'platform/deploy',
  'platform/governance',
  'platform/infra',
  'platform/secrets',
  'platform/workers',
  'tooling/scripts',
  'tooling/tests',
  'docs',
  'public',
]
const FORBIDDEN_LEGACY_ROOTS = [
  'a2a',
  'app',
  'config',
  'deploy',
  'e2e',
  'i18n',
  'infra',
  'messages',
  'product',
  'scripts',
  'secrets',
  'tests',
  'tools',
  'types',
  'workers',
]
const FORBIDDEN_ROUTE_INTERNALS = [
  'src/app/actions',
  'src/app/components',
  'src/app/lib',
]

const failures = []
const visibleRootDirectories = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
  .map((entry) => entry.name)
  .filter((name) => name !== 'node_modules' && !GENERATED_ROOT_DIRECTORIES.has(name))
  .sort()

for (const directory of visibleRootDirectories) {
  if (!ALLOWED_ROOT_DIRECTORIES.has(directory)) {
    failures.push(`unexpected root directory: ${directory}/`)
  }
}

for (const directory of ALLOWED_ROOT_DIRECTORIES) {
  if (!visibleRootDirectories.includes(directory)) {
    failures.push(`missing canonical root directory: ${directory}/`)
  }
}

for (const relativePath of REQUIRED_PATHS) {
  const absolutePath = join(ROOT, relativePath)
  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    failures.push(`missing required directory: ${relativePath}/`)
  }
}

for (const relativePath of FORBIDDEN_LEGACY_ROOTS) {
  if (existsSync(join(ROOT, relativePath))) {
    failures.push(`legacy root directory must not return: ${relativePath}/`)
  }
}

for (const relativePath of FORBIDDEN_ROUTE_INTERNALS) {
  if (existsSync(join(ROOT, relativePath))) {
    failures.push(`shared code must stay outside the route tree: ${relativePath}/`)
  }
}

for (const localStateFile of ['sin_goal_mode.db', 'tsconfig.tsbuildinfo']) {
  if (existsSync(join(ROOT, localStateFile))) {
    failures.push(`generated local state must not live in the repository root: ${localStateFile}`)
  }
}

if (failures.length > 0) {
  console.error(`repository structure check failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`repository structure check passed (${visibleRootDirectories.length} canonical root directories).`)
