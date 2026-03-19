import { CreditCard, ReceiptText, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PAYMENT_METHODS } from '@/features/checkout/constants'
import type { PaymentMethod } from '@/features/checkout/types'

type PaymentStepProps = {
  method: PaymentMethod
  onMethodChange: (method: PaymentMethod) => void
  onBack: () => void
  onContinue: () => void
}

export function PaymentStep({ method, onMethodChange, onBack, onContinue }: PaymentStepProps) {
  const hasSingleMethod = PAYMENT_METHODS.length === 1

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl">Zahlungsmethode</h2>
        <p className="mt-2 text-sm leading-7 text-brand-text-muted">
          Wähle deine bevorzugte Zahlungsmethode. Alle Transaktionen sind sicher und nach modernsten Standards verschlüsselt.
        </p>
      </div>

      {hasSingleMethod ? (
        <div className="rounded-[1.35rem] border border-black bg-black p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>
                <span className="block text-sm font-semibold">{PAYMENT_METHODS[0]?.label}</span>
                <span className="mt-1 block text-sm text-white/75">{PAYMENT_METHODS[0]?.info}</span>
              </span>
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em]">
              Aktiv
            </span>
          </div>
          <p className="mt-3 text-xs leading-6 text-white/75">
            Schnell und sicher bezahlen. Deine Daten sind bei uns in besten Händen.
          </p>
        </div>
      ) : (
        PAYMENT_METHODS.map((entry) => {
          const selected = method === entry.id
          return (
            <label
              key={entry.id}
              className={[
                'flex cursor-pointer items-center justify-between gap-3 rounded-[1.35rem] border p-4 transition-colors',
                selected ? 'border-black bg-black text-white' : 'border-brand-border bg-white text-brand-text',
              ].join(' ')}
            >
              <span>
                <span className="block text-sm font-semibold">{entry.label}</span>
                <span className={['mt-1 block text-sm', selected ? 'text-white/75' : 'text-brand-text-muted'].join(' ')}>
                  {entry.info}
                </span>
              </span>
              <input
                type="radio"
                name="payment_method"
                checked={selected}
                aria-label={entry.label}
                onChange={() => onMethodChange(entry.id)}
                className="h-4 w-4"
              />
            </label>
          )
        })
      )}

      <p className="rounded-[1.2rem] border border-brand-border bg-brand-bg px-4 py-3 text-xs text-brand-text-muted">
        Deine Bestellung wird erst im nächsten Schritt nach deiner finalen Prüfung verbindlich abgeschlossen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] border border-brand-border bg-white px-4 py-3 text-sm text-brand-text-muted">
          <p className="inline-flex items-center gap-2 font-semibold text-brand-text">
            <ShieldCheck className="h-4 w-4 text-brand-success" />
            Volle Kostentransparenz
          </p>
          <p className="mt-2 text-xs leading-6">Du siehst alle Kosten auf einen Blick, bevor du zahlst.</p>
        </div>
        <div className="rounded-[1.2rem] border border-brand-border bg-white px-4 py-3 text-sm text-brand-text-muted">
          <p className="inline-flex items-center gap-2 font-semibold text-brand-text">
            <ReceiptText className="h-4 w-4 text-brand-text" />
            Sicher einkaufen
          </p>
          <p className="mt-2 text-xs leading-6">Im nächsten Schritt kannst du deine Bestellung noch einmal in Ruhe prüfen.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} fullWidth>
          Zurück
        </Button>
        <Button onClick={onContinue} fullWidth>
          Weiter zur Prüfung
        </Button>
      </div>
    </div>
  )
}
