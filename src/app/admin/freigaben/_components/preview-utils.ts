export function previewRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function previewRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(previewRecord).filter((item): item is Record<string, unknown> => item !== null)
    : []
}

export function previewText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
