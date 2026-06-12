// Purpose: Time-based newsletter popup with discount code
// Docs: AGENTS.md

'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, Gift } from 'lucide-react'
import { subscribeNewsletter } from '@/app/actions/newsletter'

export function NewsletterCapture() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('newsletter-popup-seen')) return
    if (sessionStorage.getItem('exit-offer-shown')) return
    const timer = setTimeout(() => {
      setShow(true)
      localStorage.setItem('newsletter-popup-seen', '1')
    }, 25_000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-title"
      onClick={() => setShow(false)}
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-background p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShow(false)}
          aria-label="Schließen"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <Gift className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />

        {done ? (
          <>
            <h2 id="nl-title" className="mb-2 text-xl font-bold">Willkommen an Bord!</h2>
            <p className="text-sm text-muted-foreground text-pretty">
              Dein Code: <span className="font-mono font-bold text-primary">WILLKOMMEN10</span> — löse ihn an der Kasse ein.
            </p>
          </>
        ) : (
          <>
            <h2 id="nl-title" className="mb-1 text-xl font-bold text-balance">
              10 % Rabatt für Neukunden
            </h2>
            <p className="mb-4 text-sm text-muted-foreground text-pretty">
              Trag dich ein und erhalte sofort deinen Gutscheincode plus exklusive Deals vor allen anderen.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  const fd = new FormData()
                  fd.append('email', email)
                  await subscribeNewsletter({ ok: false, message: '' }, fd)
                  setDone(true)
                })
              }}
              className="flex flex-col gap-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine@email.de"
                aria-label="E-Mail-Adresse"
                className="rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Wird gesendet…' : 'Code sichern'}
              </button>
            </form>
            <p className="mt-2 text-[10px] text-muted-foreground">Abmeldung jederzeit möglich. Kein Spam.</p>
          </>
        )}
      </div>
    </div>
  )
}
