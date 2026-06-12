// app/components/conversion/newsletter-capture.tsx
// Purpose: Zeitgesteuertes Newsletter-Popup — erscheint erst NACH dem
// Cookie-Consent, nie gleichzeitig mit anderen Overlays.

'use client'

import { useEffect, useState, useTransition } from 'react'
import { X, Gift } from 'lucide-react'
import { subscribeNewsletter } from '@/app/actions/newsletter'

const SEEN_KEY = 'newsletter-popup-seen'
const DELAY_MS = 25_000

function hasConsent(): boolean {
  return /(?:^|; )sin-cookie-consent=/.test(document.cookie)
}

export function NewsletterCapture() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY)) return
    if (sessionStorage.getItem('exit-offer-shown')) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const arm = () => {
      timer = setTimeout(() => setShow(true), DELAY_MS)
    }

    if (hasConsent()) {
      arm()
    } else {
      const onConsent = () => arm()
      window.addEventListener('sin:consent', onConsent, { once: true })
      return () => {
        window.removeEventListener('sin:consent', onConsent)
        if (timer) clearTimeout(timer)
      }
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  function dismiss() {
    localStorage.setItem(SEEN_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-title"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-xl bg-background p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Schließen"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <Gift className="mx-auto mb-3 size-10 text-primary" aria-hidden="true" />

        {done ? (
          <>
            <h2 id="nl-title" className="mb-2 text-xl font-bold">Willkommen an Bord!</h2>
            <p className="text-sm text-muted-foreground">
              Dein Code: <span className="font-mono font-bold text-primary">WILLKOMMEN10</span> —
              löse ihn an der Kasse ein.
            </p>
          </>
        ) : (
          <>
            <h2 id="nl-title" className="mb-1 text-xl font-bold text-balance">
              10 % Rabatt für Neukunden
            </h2>
            <p className="mb-4 text-sm text-muted-foreground text-pretty">
              Trag dich ein und erhalte sofort deinen Gutscheincode plus exklusive Deals
              vor allen anderen.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                startTransition(async () => {
                  const fd = new FormData()
                  fd.append('email', email)
                  await subscribeNewsletter({ ok: false, message: '' }, fd)
                  localStorage.setItem(SEEN_KEY, '1')
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
