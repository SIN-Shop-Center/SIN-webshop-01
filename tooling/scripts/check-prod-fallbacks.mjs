#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const ROOT = process.cwd()
const BUILD_DIRS = [join(ROOT, '.next'), join(ROOT, '.open-next')]
const FORBIDDEN_SNIPPETS = [
  'https://runtime-check.invalid',
  'https://shop.example.com',
  'Simone Shop',
  'info@um-24.de',
  'apps/web/src/app',
]
const SKIP_EXTENSIONS = new Set(['.map', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (stats.size > MAX_FILE_SIZE || SKIP_EXTENSIONS.has(extname(entry).toLowerCase())) continue
    files.push(fullPath)
  }
  return files
}

const existingBuildDirs = BUILD_DIRS.filter(existsSync)
if (existingBuildDirs.length === 0) {
  console.error('Production fallback validation failed: neither .next nor .open-next exists. Run a production build first.')
  process.exit(1)
}

const matches = []
for (const directory of existingBuildDirs) {
  for (const filePath of walk(directory)) {
    let content = ''
    try {
      content = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }
    for (const snippet of FORBIDDEN_SNIPPETS) {
      if (content.includes(snippet)) {
        matches.push(`${relative(ROOT, filePath)}: ${snippet}`)
      }
    }
  }
}

if (matches.length > 0) {
  console.error('Production fallback validation failed. Built output contains forbidden legacy or placeholder values:')
  for (const match of matches.slice(0, 100)) console.error(`- ${match}`)
  if (matches.length > 100) console.error(`- ...and ${matches.length - 100} more`)
  process.exit(1)
}

console.log(`Production fallback validation passed (${existingBuildDirs.map((dir) => relative(ROOT, dir)).join(', ')}).`)
