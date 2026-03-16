import fs from 'node:fs/promises'
import { z } from 'zod'
import { getSPMConfig } from './config.mjs'
import { loadCatalog, saveCatalog, upsertCatalogSecret, bindCatalogTarget, removeCatalogTarget } from './catalog.mjs'
import { createKeychainBackend } from './backends/keychain.mjs'
import { createFileBackend } from './backends/file.mjs'
import { syncSecretToTarget } from './providers.mjs'

const targetSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['github_actions_repo', 'cloudflare_worker_secret', 'vercel_project_env', 'huggingface_space_secret']),
  authSecretName: z.string().min(1),
  params: z.record(z.any()).default({}),
})

function maskValue(value) {
  if (!value) {
    return ''
  }
  if (value.length <= 6) {
    return '••••••'
  }
  return `${value.slice(0, 3)}••••${value.slice(-3)}`
}

function assertSecretName(name) {
  if (!/^[A-Z0-9_.-]{2,}$/.test(String(name || '').trim())) {
    throw new Error('secret_name_invalid')
  }
}

export function createSPMStore(customConfig = null) {
  const config = customConfig || getSPMConfig()
  const backend = config.backend === 'keychain'
    ? createKeychainBackend({ serviceName: config.serviceName })
    : createFileBackend({ file: config.fileVault, masterKey: config.masterKey })

  return {
    config,
    async putSecret({ name, value, description = '', tags = [] }) {
      assertSecretName(name)
      await fs.mkdir(config.stateDir, { recursive: true })
      await backend.put(name, value)
      const catalog = await loadCatalog(config.catalogFile)
      const entry = upsertCatalogSecret(catalog, { name, description, tags })
      await saveCatalog(config.catalogFile, catalog)
      return {
        ...entry,
        maskedValue: maskValue(value),
      }
    },
    async getSecret({ name, reveal = false }) {
      assertSecretName(name)
      const catalog = await loadCatalog(config.catalogFile)
      const meta = catalog.secrets[name]
      if (!meta) {
        return null
      }
      const value = await backend.get(name)
      return {
        ...meta,
        maskedValue: maskValue(value),
        value: reveal ? value : undefined,
      }
    },
    async deleteSecret({ name }) {
      assertSecretName(name)
      await backend.remove(name)
      const catalog = await loadCatalog(config.catalogFile)
      delete catalog.secrets[name]
      await saveCatalog(config.catalogFile, catalog)
      return { deleted: true, name }
    },
    async listSecrets() {
      const catalog = await loadCatalog(config.catalogFile)
      return Object.values(catalog.secrets).sort((a, b) => a.name.localeCompare(b.name))
    },
    async bindTarget({ name, target }) {
      assertSecretName(name)
      const parsedTarget = targetSchema.parse(target)
      const catalog = await loadCatalog(config.catalogFile)
      bindCatalogTarget(catalog, name, parsedTarget)
      await saveCatalog(config.catalogFile, catalog)
      return parsedTarget
    },
    async unbindTarget({ name, targetId }) {
      assertSecretName(name)
      const catalog = await loadCatalog(config.catalogFile)
      const targets = removeCatalogTarget(catalog, name, targetId)
      await saveCatalog(config.catalogFile, catalog)
      return { name, targets }
    },
    async listTargets({ name = '' } = {}) {
      const catalog = await loadCatalog(config.catalogFile)
      if (name) {
        return catalog.secrets[name]?.targets || []
      }
      return Object.values(catalog.secrets).flatMap((secret) =>
        (secret.targets || []).map((target) => ({ ...target, secretName: secret.name })),
      )
    },
    async syncSecret({ name, targetIds = [] }) {
      assertSecretName(name)
      const catalog = await loadCatalog(config.catalogFile)
      const secret = catalog.secrets[name]
      if (!secret) {
        throw new Error(`secret_not_found:${name}`)
      }
      const secretValue = await backend.get(name)
      const targets = (secret.targets || []).filter((target) => targetIds.length === 0 || targetIds.includes(target.id))
      const results = []
      for (const target of targets) {
        const authValue = await backend.get(target.authSecretName)
        const synced = await syncSecretToTarget({
          config,
          target,
          secretName: name,
          secretValue,
          authValue,
        })
        results.push({ targetId: target.id, ...synced, syncedAt: new Date().toISOString() })
      }
      return {
        name,
        count: results.length,
        results,
      }
    },
    async syncAllSecrets() {
      const secrets = await this.listSecrets()
      const results = []
      for (const secret of secrets) {
        if (!Array.isArray(secret.targets) || secret.targets.length === 0) {
          continue
        }
        results.push(await this.syncSecret({ name: secret.name }))
      }
      return results
    },
  }
}
