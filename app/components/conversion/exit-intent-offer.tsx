// Purpose: Exit-intent popup with discount code
// Docs: AGENTS.md

'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/use-focus-trap'

export function ExitIntentOffer() {
  const [show, setShow] = useState(false)
  const trapRef = useFocusTrap(show, { onEscape: () => setShow(false) })

  useEffect(() => {
    if (sessionStorage.getItem('exit-offer-shown')) return

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        setShow(true)
        sessionStorage.setItem('exit-offer-shown', '1')
        document.removeEventListener('mouseleave', handleMouseLeave)
      }
    }

    const timer = setTimeout(() => document.addEventListener('mouseleave', handleMouseLeave), 5000)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-offer-title"
      onClick={() => setShow(false)}
    >
      <div
        ref={trapRef}
        className="relative w-full max-w-md rounded-xl bg-background p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          aria-label="Schließen"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-sale">Warte kurz!</p>
        <h2 id="exit-offer-title" className="mb-2 text-2xl font-bold text-balance">
          10 % Rabatt auf deine erste Bestellung
        </h2>
        <p className="mb-5 text-sm text-muted-foreground text-pretty">
          Sichere dir jetzt deinen Gutscheincode an der Kasse — nur für kurze Zeit gültig.
        </p>

        <div className="mb-5 rounded-lg border-2 border-dashed border-primary bg-primary/5 px-4 py-3">
          <p className="font-mono text-lg font-bold tracking-widest text-primary">WILLKOMMEN10</p>
        </div>

        <button
          onClick={() => setShow(false)}
          autoFocus
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Code sichern und weitershoppen
        </button>
      </div>
    </div>
  )
}
