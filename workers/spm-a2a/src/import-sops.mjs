import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { createSPMStore } from '@simone/spm-core'

const execFileAsync = promisify(execFile)

async function main() {
  const file = resolveImportFile(String(process.argv[2] || '').trim())
  const store = createSPMStore()
  const content = await decryptMaybeSops(file)
  const imported = []

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue
    }
    const separator = trimmed.indexOf('=')
    const name = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim()
    if (!name || !value || !/^[A-Z0-9_.-]{2,}$/.test(name)) {
      continue
    }
    await store.putSecret({ name, value })
    imported.push(name)
  }

  console.log(JSON.stringify({ ok: true, imported }, null, 2))
}

function resolveImportFile(raw) {
  if (raw) {
    return raw
  }
  return path.resolve(process.cwd(), 'secrets', 'agents.enc.env')
}

async function decryptMaybeSops(file) {
  try {
    const { stdout } = await execFileAsync('sops', ['-d', file], { maxBuffer: 10 * 1024 * 1024 })
    return stdout
  } catch {
    const { readFile } = await import('node:fs/promises')
    return readFile(file, 'utf8')
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
