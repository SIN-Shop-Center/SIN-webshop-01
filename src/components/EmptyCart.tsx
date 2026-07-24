import Link from 'next/link'
import { ArrowRight, ShoppingBag } from 'lucide-react'

export function EmptyCart() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center sm:px-10">
        <div className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-background">
          <ShoppingBag className="size-5" strokeWidth={1.8} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em]">
          Dein Warenkorb ist leer
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Lege ein verfügbares Produkt in den Warenkorb, bevor du den Checkout startest.
        </p>
        <Link href="/produkte" className="btn btn-primary btn-lg mt-7 inline-flex">
          Produkte ansehen
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </main>
  )
}
