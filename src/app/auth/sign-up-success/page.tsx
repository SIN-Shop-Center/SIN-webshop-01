// Purpose: Sign-up success page (Step 2 + Step 10 — MailIcon, better copy)
// Docs: PLAN-VERKAUFSFAEHIG.md

import Link from 'next/link'
import { MailIcon, ArrowLeftIcon } from '@/components/icons'

export default function SignUpSuccessPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-primary/10">
        <MailIcon className="size-8 text-primary" aria-hidden />
      </div>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">Fast geschafft</h1>
      <p className="mb-8 max-w-sm text-pretty text-muted-foreground">
        Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den
        Link in der E-Mail, um dein Konto zu aktivieren. Prüfe gegebenenfalls
        auch deinen Spam-Ordner.
      </p>
      <Link href="/" className="btn btn-outline btn-md">
        <ArrowLeftIcon className="size-4" aria-hidden />
        Zur Startseite
      </Link>
    </div>
  )
}
