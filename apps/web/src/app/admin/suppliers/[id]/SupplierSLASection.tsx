import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type SupplierSLASectionProps = {
  slaAckHours: number
  slaFulfillmentHours: number
  paymentTermsDays: number
  earlyPaymentDiscountPct: number | null
  earlyPaymentDiscountDays: number | null
  savingSupplier: boolean
  onSlaAckHoursChange: (value: number) => void
  onSlaFulfillmentHoursChange: (value: number) => void
  onPaymentTermsDaysChange: (value: number) => void
  onEarlyPaymentDiscountPctChange: (value: number | null) => void
  onEarlyPaymentDiscountDaysChange: (value: number | null) => void
  onSave: () => void
}

export function SupplierSLASection({
  slaAckHours,
  slaFulfillmentHours,
  paymentTermsDays,
  earlyPaymentDiscountPct,
  earlyPaymentDiscountDays,
  savingSupplier,
  onSlaAckHoursChange,
  onSlaFulfillmentHoursChange,
  onPaymentTermsDaysChange,
  onEarlyPaymentDiscountPctChange,
  onEarlyPaymentDiscountDaysChange,
  onSave,
}: SupplierSLASectionProps) {
  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
          <Clock className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl">Terms & SLA</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Definition der Service-Level-Agreements und Zahlungsbedingungen fuer diesen Supplier.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Order Acknowledgement (Stunden)"
            type="number"
            value={slaAckHours}
            onChange={(e) => onSlaAckHoursChange(Number(e.target.value))}
            placeholder="24"
            hint="Zeit bis der Supplier die Order bestaetigen muss."
          />
          <Input
            label="Order Fulfillment (Stunden)"
            type="number"
            value={slaFulfillmentHours}
            onChange={(e) => onSlaFulfillmentHoursChange(Number(e.target.value))}
            placeholder="72"
            hint="Zeit bis zum Versand (Tracking-Nummer vorhanden)."
          />
        </div>

        <div className="border-t border-brand-border pt-6">
          <h3 className="text-sm font-semibold text-brand-text">Zahlungsbedingungen</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Input
              label="Zahlungsziel (Tage)"
              type="number"
              value={paymentTermsDays}
              onChange={(e) => onPaymentTermsDaysChange(Number(e.target.value))}
              placeholder="30"
              hint="Standard Zahlungsziel (Net X)."
            />
            <Input
              label="Skonto (%)"
              type="number"
              step="0.1"
              value={earlyPaymentDiscountPct ?? ''}
              onChange={(e) => onEarlyPaymentDiscountPctChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="2.0"
              hint="Fruehzahlerrabatt."
            />
            <Input
              label="Skonto-Zeitraum (Tage)"
              type="number"
              value={earlyPaymentDiscountDays ?? ''}
              onChange={(e) => onEarlyPaymentDiscountDaysChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="10"
              hint="Rabatt bei Zahlung innerhalb von X Tagen."
            />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={onSave} isLoading={savingSupplier}>
          Bedingungen speichern
        </Button>
      </div>
    </section>
  )
}
