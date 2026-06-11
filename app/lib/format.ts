// Purpose: Locale-aware number/date formatting helpers (de-DE)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10 — UX polish, i18n consistency)
//
// All prices in the storefront are stored as cents (integer) and formatted
// at the render boundary — never call toFixed(2) + ' €' on raw numbers.

const EUR_FORMATTER = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

export function formatEuro(cents: number): string {
  return EUR_FORMATTER.format(cents / 100)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
