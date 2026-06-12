// Purpose: Stock-related custom errors (used by cart and checkout actions)
// Docs: Issue #37 — Inventory-Race-Condition

export class StockExhaustedError extends Error {
  constructor() {
    super('stock_exhausted')
    this.name = 'StockExhaustedError'
  }
}

export type CartResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: 'stock_exhausted' | 'invalid_qty' | 'no_cart' | string }
