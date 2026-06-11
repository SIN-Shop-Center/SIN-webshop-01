// Purpose: Pure Pricing-Logik mit FX-Rate (Issue #35)
// Docs: docs/PRICING.md
//
// USD-Cost × FX(USD→EUR) × CJ_MULTIPLIER → EUR-Preis
// .99-Magic-Pricing: (ceil - 0.01).toFixed(2) → 22.99, 23.99, 24.99
//
// Diese Datei enthält NUR pure Funktionen (kein DB-Import), damit
// Unit-Tests sie ohne 'server-only'-Mock laden können.
// FX-Rate-Loading lebt in ./pricing-fx.ts.

export function calcPriceEur(
  costUsd: number,
  fxRate: number,
  multiplier: number,
): string {
  const eur = costUsd * fxRate * multiplier
  return (Math.ceil(eur) - 0.01).toFixed(2)
}
