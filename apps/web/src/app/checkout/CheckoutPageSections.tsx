import Link from '@/components/ui/Link'
import { ArrowLeft } from 'lucide-react'

type CheckoutPageHeaderProps = {
  segmentLabel: string
}

export function CheckoutPageHeader({ segmentLabel }: CheckoutPageHeaderProps) {
  return (
    <header className="mb-6 rounded-[1.8rem] border border-brand-border bg-white p-6 shadow-[0_12px_30px_rgba(10,10,10,0.05)]">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-brand-text-muted hover:text-brand-text">
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Warenkorb
      </Link>
      <h1 className="mt-3 text-4xl md:text-5xl">Checkout</h1>
      <p className="mt-2 max-w-2xl text-brand-text-muted">
        Sicherer Checkout. Deine Daten werden verschlüsselt übertragen und vertraulich behandelt.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-brand-text-muted">
        <span className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5">SSL-Verschlüsselt</span>
        <span className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5">Käuferschutz</span>
        <span className="rounded-full border border-brand-border bg-brand-bg px-3 py-1.5">Schneller Versand</span>
      </div>
    </header>
  )
}

export function EmptyCheckoutCartState() {
  return (
    <main className="shell-container py-14 text-center">
      <div className="rounded-[1.8rem] border border-brand-border bg-white px-8 py-14 shadow-[0_18px_44px_rgba(18,18,18,0.06)]">
        <h1 className="text-3xl">Dein Warenkorb ist leer</h1>
        <p className="mt-3 text-brand-text-muted">Lege zuerst Produkte in den Warenkorb und starte danach den Checkout.</p>
        <Link href="/products" className="cta-primary mt-5 inline-flex min-h-[2.75rem] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150">
          Produkte ansehen
        </Link>
      </div>
    </main>
  )
}
