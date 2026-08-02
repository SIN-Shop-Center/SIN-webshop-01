import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
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
  const initCwd = String(process.env.INIT_CWD || '').trim()
  const cwd = process.cwd()

  if (raw) {
    if (path.isAbsolute(raw)) {
      return raw
    }

    const fromCwd = path.resolve(cwd, raw)
    if (fs.existsSync(fromCwd)) {
      return fromCwd
    }

    if (initCwd) {
      const fromInit = path.resolve(initCwd, raw)
      if (fs.existsSync(fromInit)) {
        return fromInit
      }
    }

    return fromCwd
  }

  if (initCwd) {
    const candidate = path.resolve(initCwd, 'secrets', 'agents.enc.env')
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Fallback: walk up from current dir to find repo-root secrets.
  let dir = cwd
  for (let i = 0; i < 10; i += 1) {
    const candidate = path.resolve(dir, 'secrets', 'agents.enc.env')
    if (fs.existsSync(candidate)) {
      return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      break
    }
    dir = parent
  }

  return path.resolve(cwd, 'secrets', 'agents.enc.env')
}

async function decryptMaybeSops(file) {
  try {
    const { stdout } = await execFileAsync('sops', ['-d', file], {
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        SOPS_AGE_KEY_FILE: process.env.SOPS_AGE_KEY_FILE || path.join(os.homedir(), '.config', 'sops', 'age', 'keys.txt'),
      },
    })
    return stdout
  } catch (error) {
    if (file.endsWith('.enc.env')) {
      const details = error instanceof Error ? error.message : String(error)
      throw new Error(`sops_decrypt_failed:${file}:${details}`)
    }
    const { readFile } = await import('node:fs/promises')
    return readFile(file, 'utf8')
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
