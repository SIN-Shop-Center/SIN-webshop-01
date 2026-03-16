import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.turbo', '.npm-cache', '.notebooklm-mcp-cli', '.serena', 'output', 'tmp'])
const BASELINE_PATH = join(ROOT, 'scripts', 'guard-lines-baseline.json')
const RULES = [
  { ext: '.tsx', max: 180 },
  { ext: '.ts', max: 220 },
  { ext: '.go', max: 150 },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(entry)) {
        continue
      }
      walk(full, out)
      continue
    }
    out.push({ full, rel })
  }
  return out
}

let baseline = {}
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
} catch {
  baseline = {}
}

const violations = []
const targets = walk(ROOT).filter((file) => RULES.some((rule) => file.rel.endsWith(rule.ext)))

for (const file of targets) {
  const rule = RULES.find((entry) => file.rel.endsWith(entry.ext))
  if (!rule) {
    continue
  }

  const source = readFileSync(file.full, 'utf8')
  let lines = source === '' ? 0 : source.split(/\r?\n/).length
  if (source.endsWith('\n')) {
    lines -= 1
  }

  const baselineLimit = baseline[file.rel]
  if (typeof baselineLimit === 'number' && lines <= baselineLimit) {
    continue
  }

  if (lines > rule.max) {
    const maxInfo = typeof baselineLimit === 'number' ? `baseline ${baselineLimit} / rule ${rule.max}` : `rule ${rule.max}`
    violations.push(`${file.rel}: ${lines} lines (${maxInfo})`)
  }
}

if (violations.length > 0) {
  console.error(`Line guard violations:\n${violations.join('\n')}`)
  process.exit(1)
}

console.log('Line guard passed.')
