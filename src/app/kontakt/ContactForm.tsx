// Purpose: Contact form with ref-based reset, a11y, aria-live (Step 8 + Step 10)
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { submitContactForm, type ContactFormState } from '@/lib/actions/contact'
import { AlertCircleIcon, CheckIcon, SpinnerIcon } from '@/components/icons'

export function ContactForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<ContactFormState | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const nameId = useId()
  const emailId = useId()
  const subjectId = useId()
  const messageId = useId()
  const liveId = useId()

  function handleSubmit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await submitContactForm(formData)
      setResult(res)
      if (res.ok) {
        formRef.current?.reset()
      }
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
    >
      {/* Honeypot — für Menschen unsichtbar, Bots füllen es aus */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="hp-website">Website</label>
        <input
          id="hp-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm font-medium">
          Name <span className="text-destructive" aria-hidden>*</span>
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          className="field-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-sm font-medium">
          E-Mail <span className="text-destructive" aria-hidden>*</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={subjectId} className="text-sm font-medium">
          Betreff (optional)
        </label>
        <input
          id={subjectId}
          name="subject"
          type="text"
          maxLength={200}
          className="field-input"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageId} className="text-sm font-medium">
          Nachricht <span className="text-destructive" aria-hidden>*</span>
        </label>
        <textarea
          id={messageId}
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="field-input"
        />
        <p className="field-hint">Mindestens 10 Zeichen, maximal 5000.</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn btn-primary btn-lg w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="size-5 animate-spin" aria-hidden />
            Wird gesendet…
          </>
        ) : (
          'Nachricht senden'
        )}
      </button>

      <div id={liveId} aria-live="polite" className="sr-only">
        {result?.error ? 'Fehler: ' + result.error : null}
        {result?.success ? 'Erfolg: ' + result.success : null}
      </div>

      {result?.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{result.error}</span>
        </div>
      )}
      {result?.success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm text-success"
        >
          <CheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{result.success}</span>
        </div>
      )}
    </form>
  )
}
