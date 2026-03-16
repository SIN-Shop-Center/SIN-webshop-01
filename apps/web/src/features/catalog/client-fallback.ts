export function allowCatalogSampleFallback(): boolean {
  const toggle = (process.env.NEXT_PUBLIC_WEB_CATALOG_FALLBACK_ENABLED || '').trim().toLowerCase()
  if (toggle === 'true') {
    return true
  }
  if (toggle === 'false') {
    return false
  }
  return process.env.NODE_ENV !== 'production'
}
