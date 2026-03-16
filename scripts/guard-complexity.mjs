import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const IGNORE_DIRS = new Set([
  '.git',
  '.next',
  '.notebooklm-mcp-cli',
  '.npm-cache',
  '.serena',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'output',
  'tmp',
])
const MAX_BRANCHES_PER_FILE = 120
const BASELINE_PATH = join(ROOT, 'scripts', 'guard-complexity-baseline.json')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue
      walk(full, out)
    } else {
      out.push({ full, rel })
    }
  }
  return out
}

const targets = walk(ROOT).filter((file) => /\.(ts|tsx|go)$/.test(file.rel))
const violations = []
let baseline = {}

if (existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch (error) {
    console.error(`Failed to read complexity baseline at ${BASELINE_PATH}:`, error)
    process.exit(1)
  }
}

for (const file of targets) {
  const source = readFileSync(file.full, 'utf8')
  const branches = (source.match(/\b(if|switch|case|for|while|catch|\?|&&|\|\|)\b/g) || []).length
  const baselineLimit = baseline[file.rel]
  if (typeof baselineLimit === 'number' && branches <= baselineLimit) {
    continue
  }
  if (branches > MAX_BRANCHES_PER_FILE) {
    const maxInfo = typeof baselineLimit === 'number'
      ? `baseline ${baselineLimit} / max ${MAX_BRANCHES_PER_FILE}`
      : `max ${MAX_BRANCHES_PER_FILE}`
    violations.push(`${file.rel}: branch tokens ${branches} (${maxInfo})`)
  }
}

if (violations.length > 0) {
  console.error('Complexity guard violations:\n' + violations.join('\n'))
  process.exit(1)
}

console.log('Complexity guard passed.')
