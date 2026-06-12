// Purpose: Show recently viewed products from localStorage
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type ViewedItem = { id: string; name: string; price: number; image: string }

const STORAGE_KEY = 'recently-viewed'

export function trackProductView(product: ViewedItem) {
  try {
    const existing: ViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    const updated = [product, ...existing.filter((p) => p.id !== product.id)].slice(0, 10)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage nicht verfügbar
  }
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<ViewedItem[]>([])

  useEffect(() => {
    try {
      const stored: ViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      setItems(stored.filter((p) => p.id !== excludeId).slice(0, 6))
    } catch {
      setItems([])
    }
  }, [excludeId])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="recent-heading" className="mt-12">
      <h2 id="recent-heading" className="mb-4 text-xl font-bold">
        Zuletzt angesehen
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link key={item.id} href={`/produkt/${item.id}`} className="group w-36 shrink-0">
            <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={item.image || '/placeholder.svg'}
                alt={item.name}
                fill
                sizes="144px"
                className="object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <p className="line-clamp-2 text-xs leading-snug">{item.name}</p>
            <p className="text-sm font-bold text-primary">
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
