import { CACHE_STORAGE_VERSION } from './client-constants'
import type { CacheEntry, CacheNamespace, StorageReadOptions } from './client-types'

function storageKey(namespace: CacheNamespace, key: string): string {
  return `simone:${CACHE_STORAGE_VERSION}:${namespace}:${key}`
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function readStorageEntry<T>(
  namespace: CacheNamespace,
  key: string,
  options: StorageReadOptions = {},
): CacheEntry<T> | null {
  const { allowExpired = false } = options
  if (!canUseSessionStorage()) {
    return null
  }

  const keyName = storageKey(namespace, key)
  try {
    const raw = window.sessionStorage.getItem(keyName)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || !('expiresAt' in parsed) || !('value' in parsed)) {
      window.sessionStorage.removeItem(keyName)
      return null
    }

    const entry = parsed as CacheEntry<T>
    if (typeof entry.expiresAt !== 'number') {
      window.sessionStorage.removeItem(keyName)
      return null
    }

    if (!allowExpired && entry.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(keyName)
      return null
    }

    return entry
  } catch {
    return null
  }
}

export function writeStorageEntry<T>(namespace: CacheNamespace, key: string, entry: CacheEntry<T>) {
  if (!canUseSessionStorage()) {
    return
  }
  try {
    window.sessionStorage.setItem(storageKey(namespace, key), JSON.stringify(entry))
  } catch {
    // Session storage is best-effort and should never break shopping flows.
  }
}

export function deleteStorageEntry(namespace: CacheNamespace, key: string) {
  if (!canUseSessionStorage()) {
    return
  }
  try {
    window.sessionStorage.removeItem(storageKey(namespace, key))
  } catch {
    // Session storage cleanup is best-effort.
  }
}
