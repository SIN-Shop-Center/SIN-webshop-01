// Purpose: Floating "Someone just bought X" popups
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type ProofItem = {
  id: string
  name: string
  image: string
}

const buyers = [
  'Anna aus Berlin', 'Lukas aus Hamburg', 'Sophie aus München', 'Jonas aus Köln',
  'Mia aus Frankfurt', 'Leon aus Stuttgart', 'Emma aus Leipzig', 'Finn aus Dresden',
  'Lena aus Hannover', 'Paul aus Bremen',
]

const timeAgo = ['vor 2 Minuten', 'vor 5 Minuten', 'vor 12 Minuten', 'vor 18 Minuten', 'vor 27 Minuten']

export function SocialProofToast({ products }: { products: ProofItem[] }) {
  const [current, setCurrent] = useState<{ buyer: string; product: ProofItem; time: string } | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (products.length === 0) return

    let showTimer: ReturnType<typeof setTimeout>
    let hideTimer: ReturnType<typeof setTimeout>

    function cycle(delay: number) {
      showTimer = setTimeout(() => {
        setCurrent({
          buyer: buyers[Math.floor(Math.random() * buyers.length)],
          product: products[Math.floor(Math.random() * products.length)],
          time: timeAgo[Math.floor(Math.random() * timeAgo.length)],
        })
        setVisible(true)
        hideTimer = setTimeout(() => {
          setVisible(false)
          cycle(12_000 + Math.random() * 15_000)
        }, 6000)
      }, delay)
    }

    cycle(8000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [products])

  if (!current) return null

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-40 w-72 transition-all duration-500 max-md:bottom-20 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <Link
        href={`/produkt/${current.product.id}`}
        className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-lg"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <Image src={current.product.image || '/placeholder.svg'} alt="" fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug">
            {current.buyer} hat gerade gekauft:
          </p>
          <p className="truncate text-xs text-muted-foreground">{current.product.name}</p>
          <p className="text-[10px] text-muted-foreground">{current.time}</p>
        </div>
      </Link>
    </div>
  )
}
