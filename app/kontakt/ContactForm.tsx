// Purpose: Contact form client component (Step 8)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 8 — Admin Dashboard)

'use client'

import { useState, useTransition } from 'react'
import { submitContactForm, type ContactFormState } from '@/lib/actions/contact'

export function ContactForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ContactFormState | null>(null)

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await submitContactForm(formData)
      setResult(res)
      if (res.ok) {
        const form = document.querySelector('form') as HTMLFormElement | null
        form?.reset()
      }
    })
  }

  return (
    <form
      action={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border p-6"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Name <span className="text-red-600">*</span>
        </span>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          E-Mail <span className="text-red-600">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Betreff (optional)</span>
        <input
          name="subject"
          type="text"
          maxLength={200}
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Nachricht <span className="text-red-600">*</span>
        </span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="rounded-lg border border-input bg-background px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Wird gesendet…' : 'Nachricht senden'}
      </button>

      {result?.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {result.error}
        </p>
      )}
      {result?.success && (
        <p className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          {result.success}
        </p>
      )}
    </form>
  )
}
