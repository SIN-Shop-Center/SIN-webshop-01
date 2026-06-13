// Purpose: "Frequently bought together" bundle upsell
// Docs: AGENTS.md

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Check } from 'lucide-react'

type BundleProduct = {
  id: string
  name: string
  price: number
  image: string
}

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
}

export function BoughtTogether({ mainProduct, suggestions }: { mainProduct: BundleProduct; suggestions: BundleProduct[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(suggestions.slice(0, 2).map((p) => p.id)))
  const [added, setAdded] = useState(false)

  if (suggestions.length === 0) return null

  const bundle = [mainProduct, ...suggestions.filter((p) => selected.has(p.id))]
  const total = bundle.reduce((sum, p) => sum + p.price, 0)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addBundle() {
    bundle.forEach((p) => {
      try {
        const raw = localStorage.getItem('sin-cart')
        const items = raw ? JSON.parse(raw) : []
        items.push({ id: p.id, product_id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 })
        localStorage.setItem('sin-cart', JSON.stringify(items))
        window.dispatchEvent(new Event('cart-updated'))
        window.dispatchEvent(new CustomEvent('open-cart'))
      } catch { /* ignore */ }
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <section aria-labelledby="bundle-heading" className="mt-10 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 id="bundle-heading" className="mb-4 text-lg font-bold">
        Wird oft zusammen gekauft
      </h2>

      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
        {[mainProduct, ...suggestions].map((product, i) => (
          <div key={product.id} className="flex items-center gap-2">
            {i > 0 && <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => i > 0 && toggle(product.id)}
              disabled={i === 0}
              aria-pressed={i === 0 || selected.has(product.id)}
              aria-label={`${product.name} ${i === 0 || selected.has(product.id) ? 'im Bundle' : 'zum Bundle hinzufügen'}`}
              className={`relative size-20 shrink-0 overflow-hidden rounded-md border-2 transition-all md:size-24 ${
                i === 0 || selected.has(product.id) ? 'border-primary' : 'border-border opacity-50'
              }`}
            >
              <Image src={product.image || '/placeholder.svg'} alt="" fill sizes="96px" className="object-cover" />
            </button>
          </div>
        ))}
      </div>

      <ul className="mb-3 flex flex-col gap-1">
        {[mainProduct, ...suggestions].map((product, i) => {
          const active = i === 0 || selected.has(product.id)
          return (
            <li key={product.id} className={`flex items-center justify-between gap-2 text-sm ${active ? '' : 'opacity-50'}`}>
              <span className="line-clamp-1">
                {i === 0 && <span className="font-medium">Dieser Artikel: </span>}
                {product.name}
              </span>
              <span className="shrink-0 font-semibold">{formatEur(product.price)}</span>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          Gesamtpreis ({bundle.length} Artikel):{' '}
          <span className="text-lg font-bold text-primary">{formatEur(total)}</span>
        </p>
        <button
          onClick={addBundle}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {added ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              Hinzugefügt
            </>
          ) : (
            `Alle ${bundle.length} in den Warenkorb`
          )}
        </button>
      </div>
    </section>
  )
}
