// Purpose: Client-safe shipping helpers (no server-only imports)
// Docs: AGENTS.md

import { SHIPPING } from './shipping-constants'

export function getShippingCents(subtotalCents: number): number {
  return subtotalCents >= SHIPPING.freeAboveCents ? 0 : SHIPPING.standardCents
}
