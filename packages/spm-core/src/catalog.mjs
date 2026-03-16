import fs from 'node:fs/promises'
import path from 'node:path'

const EMPTY_CATALOG = {
  version: 1,
  secrets: {},
}

export async function loadCatalog(file) {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !parsed.secrets || typeof parsed.secrets !== 'object') {
      return structuredClone(EMPTY_CATALOG)
    }
    return parsed
  } catch {
    return structuredClone(EMPTY_CATALOG)
  }
}

export async function saveCatalog(file, catalog) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
}

export function upsertCatalogSecret(catalog, input) {
  const current = catalog.secrets[input.name] || {
    name: input.name,
    description: '',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targets: [],
  }

  catalog.secrets[input.name] = {
    ...current,
    description: input.description ?? current.description,
    tags: Array.isArray(input.tags) ? [...new Set(input.tags.filter(Boolean))] : current.tags,
    updatedAt: new Date().toISOString(),
  }

  return catalog.secrets[input.name]
}

export function bindCatalogTarget(catalog, name, target) {
  const secret = catalog.secrets[name]
  if (!secret) {
    throw new Error(`secret_not_found:${name}`)
  }
  const nextTargets = [...(secret.targets || [])]
  const index = nextTargets.findIndex((entry) => entry.id === target.id)
  if (index >= 0) {
    nextTargets[index] = { ...nextTargets[index], ...target }
  } else {
    nextTargets.push(target)
  }
  secret.targets = nextTargets
  secret.updatedAt = new Date().toISOString()
  return secret.targets
}

export function removeCatalogTarget(catalog, name, targetId) {
  const secret = catalog.secrets[name]
  if (!secret) {
    throw new Error(`secret_not_found:${name}`)
  }
  secret.targets = (secret.targets || []).filter((entry) => entry.id !== targetId)
  secret.updatedAt = new Date().toISOString()
  return secret.targets
}
