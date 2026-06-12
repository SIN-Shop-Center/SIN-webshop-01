'use client'

// Purpose: Newsletter signup form with server action
// Docs: AGENTS.md

import { useActionState } from 'react'
import { subscribeNewsletter } from '@/app/actions/newsletter'

const initialState = { ok: false, message: '' }

export function NewsletterSignup() {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, initialState)

  return (
    <section aria-labelledby="newsletter-heading" className="bg-card py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 text-center">
        <h2 id="newsletter-heading" className="text-xl font-bold text-card-foreground text-balance">
          Bleib auf dem Laufenden
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Neue Produkte und Angebote direkt in dein Postfach. Abmeldung jederzeit möglich.
        </p>
        <form action={formAction} className="flex w-full max-w-md gap-2">
          <label htmlFor="newsletter-email" className="sr-only">
            E-Mail-Adresse
          </label>
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            placeholder="deine@email.de"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Wird gesendet...' : 'Anmelden'}
          </button>
        </form>
        {state.message && (
          <p role="status" className={`text-sm ${state.ok ? 'text-foreground' : 'text-destructive'}`}>
            {state.message}
          </p>
        )}
      </div>
    </section>
  )
}
