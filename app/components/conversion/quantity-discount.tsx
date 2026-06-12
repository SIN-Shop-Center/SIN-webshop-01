// Purpose: Volume discount tier selector
// Docs: AGENTS.md

'use client'

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

const tiers = [
  { qty: 1, discount: 0 },
  { qty: 2, discount: 0.05 },
  { qty: 3, discount: 0.1 },
]

export function QuantityDiscount({
  price,
  quantity,
  onSelect,
}: {
  price: number
  quantity: number
  onSelect: (qty: number) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Mehr kaufen, mehr sparen</legend>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tier) => {
          const unitPrice = price * (1 - tier.discount)
          const active = quantity === tier.qty
          return (
            <button
              key={tier.qty}
              type="button"
              onClick={() => onSelect(tier.qty)}
              aria-pressed={active}
              className={`relative flex flex-col items-center gap-0.5 rounded-md border-2 px-2 py-2.5 text-center transition-colors ${
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
              }`}
            >
              {tier.discount > 0 && (
                <span className="absolute -top-2.5 rounded bg-sale px-1.5 py-0.5 text-[10px] font-bold text-sale-foreground">
                  -{Math.round(tier.discount * 100)}%
                </span>
              )}
              <span className="text-sm font-semibold">{tier.qty} Stück</span>
              <span className={`text-xs ${tier.discount > 0 ? 'font-bold text-sale' : 'text-muted-foreground'}`}>
                {formatEur(unitPrice)}/Stk.
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
