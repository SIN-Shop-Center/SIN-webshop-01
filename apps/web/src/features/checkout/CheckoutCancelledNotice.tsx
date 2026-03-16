import Link from '@/components/ui/Link'
import { Button } from '@/components/ui/Button'
import { PUBLIC_SUPPORT_EMAIL } from '@/lib/public-contact'

type CheckoutCancelledNoticeProps = {
  retryCheckoutURL: string | null
  onRetryReview: () => void
  onSupportClick: () => void
}

export function CheckoutCancelledNotice({
  retryCheckoutURL,
  onRetryReview,
  onSupportClick,
}: CheckoutCancelledNoticeProps) {
  return (
    <section className="mb-6 rounded-[1.6rem] border border-amber-300 bg-amber-50/90 p-5">
      <p className="text-sm font-semibold text-amber-900">Zahlung noch nicht abgeschlossen.</p>
      <p className="mt-1 text-sm text-amber-800">Dein Warenkorb bleibt erhalten. Starte die Zahlung erneut oder geh noch einmal kurz durch die Bestellprüfung.</p>
      <p className="mt-2 text-xs text-amber-800">Fragen zur Bestellung: {PUBLIC_SUPPORT_EMAIL}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {retryCheckoutURL ? (
          <a href={retryCheckoutURL}>
            <Button size="sm">Zahlung erneut starten</Button>
          </a>
        ) : (
          <Button size="sm" onClick={onRetryReview}>
            Zur Bestellprüfung
          </Button>
        )}
        <Link href="/cart">
          <Button size="sm" variant="outline">
            Warenkorb prüfen
          </Button>
        </Link>
        <Link href="/kontakt" onClick={onSupportClick}>
          <Button size="sm" variant="ghost">
            Kontakt
          </Button>
        </Link>
      </div>
    </section>
  )
}
