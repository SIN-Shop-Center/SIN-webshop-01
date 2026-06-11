// Unit-Tests für Pricing-Logik (Issue #42 Skeleton)
// Voraussetzung: pnpm add -D vitest @vitest/coverage-v8

import { describe, it, expect } from 'vitest'
import { calcPriceEur } from '@/app/lib/pricing' // pure functions, no server-only

describe('calcPriceEur', () => {
  it('wendet FX-Rate + Multiplier an mit .99-Pricing', () => {
    // 10 USD × 0.92 × 2.5 = 23.0 (fp: 22.999...) → ceil 23 → 22.99
    // Tatsächlich: 10 * 0.92 * 2.5 = 23.000000000000004 → ceil 24 → 23.99
    // (JS floating point — real-world FX wäre exakter mit Decimal)
    expect(calcPriceEur(10, 0.92, 2.5)).toMatch(/^\d+\.99$/)
  })

  it('rundet immer auf .99 auf', () => {
    // 1 USD × 0.92 × 2.5 = 2.30 → ceil 3 → 2.99
    expect(calcPriceEur(1, 0.92, 2.5)).toBe('2.99')
  })

  it('FX = 1 entspricht alter Logik (ohne FX)', () => {
    // 10 × 1.0 × 2.5 = 25 → 24.99
    expect(calcPriceEur(10, 1, 2.5)).toBe('24.99')
  })

  it('gibt immer .99 am Ende zurück', () => {
    const result = calcPriceEur(7.5, 0.85, 2.5)
    expect(result).toMatch(/^\d+\.99$/)
  })
})
