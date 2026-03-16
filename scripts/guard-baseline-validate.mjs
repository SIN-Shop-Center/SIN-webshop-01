import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const lineBaselinePath = join(ROOT, 'scripts', 'guard-lines-baseline.json')
const complexityBaselinePath = join(ROOT, 'scripts', 'guard-complexity-baseline.json')
const lineRules = [
  { ext: '.tsx', max: 180 },
  { ext: '.ts', max: 220 },
  { ext: '.go', max: 150 },
]
const MAX_BRANCHES_PER_FILE = 120

let lineBaseline
try {
  lineBaseline = JSON.parse(readFileSync(lineBaselinePath, 'utf8'))
} catch (error) {
  console.error(`Failed to read line baseline file at ${lineBaselinePath}:`, error)
  process.exit(1)
}

if (!lineBaseline || typeof lineBaseline !== 'object' || Array.isArray(lineBaseline)) {
  console.error('guard-lines baseline must be a JSON object that maps file paths to numeric limits.')
  process.exit(1)
}

let complexityBaseline = {}
if (existsSync(complexityBaselinePath)) {
  try {
    complexityBaseline = JSON.parse(readFileSync(complexityBaselinePath, 'utf8'))
  } catch (error) {
    console.error(`Failed to read complexity baseline file at ${complexityBaselinePath}:`, error)
    process.exit(1)
  }
}

if (!complexityBaseline || typeof complexityBaseline !== 'object' || Array.isArray(complexityBaseline)) {
  console.error('guard-complexity baseline must be a JSON object that maps file paths to numeric limits.')
  process.exit(1)
}

function readSource(relativePath) {
  const absolutePath = join(ROOT, relativePath)
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    return null
  }
  return readFileSync(absolutePath, 'utf8')
}

function countLines(source) {
  if (source === '') {
    return 0
  }
  let lines = source.split(/\r?\n/).length
  if (source.endsWith('\n')) {
    lines -= 1
  }
  return lines
}

function countBranchTokens(source) {
  return (source.match(/\b(if|switch|case|for|while|catch|\?|&&|\|\|)\b/g) || []).length
}

const lineKeys = Object.keys(lineBaseline)
const violations = []

for (const key of lineKeys) {
  const value = lineBaseline[key]
  const rule = lineRules.find((entry) => key.endsWith(entry.ext))
  if (!rule) {
    violations.push(`${key}: unsupported file type`)
    continue
  }
  if (!Number.isInteger(value) || value < rule.max) {
    violations.push(`${key}: baseline ${value} must be an integer >= rule ${rule.max}`)
    continue
  }
  const source = readSource(key)
  if (source === null) {
    violations.push(`${key}: file missing for pinned line baseline`)
    continue
  }
  const actualLines = countLines(source)
  if (actualLines <= rule.max) {
    violations.push(`${key}: no longer needs a line baseline pin (${actualLines} <= ${rule.max})`)
    continue
  }
  if (actualLines !== value) {
    violations.push(`${key}: baseline ${value} must match current line count ${actualLines}`)
  }
}

for (const [key, value] of Object.entries(complexityBaseline)) {
  if (!Number.isInteger(value) || value < MAX_BRANCHES_PER_FILE) {
    violations.push(`${key}: complexity baseline ${value} must be an integer >= rule ${MAX_BRANCHES_PER_FILE}`)
    continue
  }
  const source = readSource(key)
  if (source === null) {
    violations.push(`${key}: file missing for pinned complexity baseline`)
    continue
  }
  const actualBranches = countBranchTokens(source)
  if (actualBranches <= MAX_BRANCHES_PER_FILE) {
    violations.push(`${key}: no longer needs a complexity baseline pin (${actualBranches} <= ${MAX_BRANCHES_PER_FILE})`)
    continue
  }
  if (actualBranches !== value) {
    violations.push(`${key}: complexity baseline ${value} must match current branch token count ${actualBranches}`)
  }
}

if (violations.length > 0) {
  console.error('guard baseline is invalid:')
  console.error(violations.map((entry) => `- ${entry}`).join('\n'))
  process.exit(1)
}

console.log(`Baseline validation passed (${lineKeys.length} line pins, ${Object.keys(complexityBaseline).length} complexity pins).`)
