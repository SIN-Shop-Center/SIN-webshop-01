import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export function readArgValue(flag, argv = process.argv.slice(2)) {
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag) {
      return argv[index + 1] || ''
    }
    if (argv[index].startsWith(`${flag}=`)) {
      return argv[index].slice(flag.length + 1)
    }
  }
  return ''
}

export function hasFlag(flag, argv = process.argv.slice(2)) {
  return argv.some((arg) => arg === flag)
}

export function loadLocalEnvFiles({ cwd = process.cwd() } = {}) {
  for (const file of localEnvCandidates(cwd)) {
    loadEnvFile(file)
  }
}

export function loadEnvFile(filePath, override = false) {
  if (!filePath || !fs.existsSync(filePath)) {
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    if (line.startsWith('export ')) {
      line = line.slice('export '.length).trim()
    }

    const separator = line.indexOf('=')
    if (separator < 0) {
      continue
    }

    const key = line.slice(0, separator).trim()
    if (!key) {
      continue
    }
    if (!override && process.env[key] !== undefined) {
      continue
    }

    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

export function localEnvCandidates(cwd) {
  const out = []
  const seen = new Set()
  let dir = cwd

  while (true) {
    appendCandidate(out, seen, path.join(dir, '.env.local'))
    appendCandidate(out, seen, path.join(dir, '.env'))
    appendCandidate(out, seen, path.join(dir, 'apps', 'web', '.env.local'))
    appendCandidate(out, seen, path.join(dir, 'apps', 'web', '.env'))
    appendCandidate(out, seen, path.join(dir, 'apps', 'api', '.env.local'))
    appendCandidate(out, seen, path.join(dir, 'apps', 'api', '.env'))

    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  return out
}

function appendCandidate(out, seen, filePath) {
  const resolved = path.resolve(filePath)
  if (seen.has(resolved)) {
    return
  }
  seen.add(resolved)
  out.push(resolved)
}
