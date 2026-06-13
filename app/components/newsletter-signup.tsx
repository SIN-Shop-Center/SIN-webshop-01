// Purpose: Compact newsletter signup form for footer
// Docs: AGENTS.md

'use client'

import { useActionState } from 'react'
import { subscribeNewsletter } from '@/app/actions/newsletter'
import { MailIcon } from 'lucide-react'

const initialState = { ok: false, message: '' }

export function NewsletterSignup() {
  const [state, formAction, pending] = useActionState(subscribeNewsletter, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="relative">
        <MailIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="newsletter-email" className="sr-only">
          E-Mail-Adresse
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="deine@email.de"
          className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-md w-full"
      >
        {pending ? 'Wird gesendet...' : 'Anmelden'}
      </button>
      {state.message && (
        <p role="status" className={`text-xs ${state.ok ? 'text-foreground' : 'text-destructive'}`}>
          {state.message}
        </p>
      )}
    </form>
  )
}
