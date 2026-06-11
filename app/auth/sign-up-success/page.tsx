// Purpose: Sign-up success page (Step 2 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

export default function SignUpSuccessPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="mb-4 text-2xl font-bold">Fast geschafft</h1>
      <p className="text-muted-foreground text-pretty">
        Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den
        Link in der E-Mail, um dein Konto zu aktivieren.
      </p>
    </div>
  )
}
