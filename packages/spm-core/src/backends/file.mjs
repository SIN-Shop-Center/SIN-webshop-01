import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

function keyBufferFromEnv(masterKey) {
  const trimmed = String(masterKey || '').trim()
  if (!trimmed) {
    throw new Error('spm_master_key_missing')
  }
  const buf = Buffer.from(trimmed, 'base64')
  if (buf.length !== 32) {
    throw new Error('spm_master_key_invalid')
  }
  return buf
}

async function loadVault(file) {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.entries || typeof parsed.entries !== 'object') {
      return { version: 1, entries: {} }
    }
    return parsed
  } catch {
    return { version: 1, entries: {} }
  }
}

async function saveVault(file, payload) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(payload, null, 2) + '\n', 'utf8')
}

function encrypt(value, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: data.toString('base64'),
  }
}

function decrypt(entry, key) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(entry.tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(entry.data, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function createFileBackend({ file, masterKey }) {
  const key = keyBufferFromEnv(masterKey)

  return {
    async put(name, value) {
      const vault = await loadVault(file)
      vault.entries[name] = encrypt(value, key)
      await saveVault(file, vault)
    },
    async get(name) {
      const vault = await loadVault(file)
      const entry = vault.entries[name]
      if (!entry) {
        throw new Error(`secret_not_found:${name}`)
      }
      return decrypt(entry, key)
    },
    async remove(name) {
      const vault = await loadVault(file)
      delete vault.entries[name]
      await saveVault(file, vault)
    },
  }
}
