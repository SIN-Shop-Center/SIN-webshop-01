// Purpose: Shipping constants — safe for client + server (no server-only imports)
// Docs: AGENTS.md

export const SHIPPING = {
  standardCents: 499,
  freeAboveCents: 4900,
  deliveryDaysMin: 7,
  deliveryDaysMax: 15,
} as const
