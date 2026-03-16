import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { ShippingData } from '@/features/checkout/types'
import { getShippingFieldErrors } from '@/features/checkout/utils'

type ShippingStepProps = {
  shippingData: ShippingData
  segment: 'b2c' | 'b2b'
  onChange: (next: ShippingData) => void
  onContinue: () => void
}

export function ShippingStep({ shippingData, segment, onChange, onContinue }: ShippingStepProps) {
  const fieldErrors = getShippingFieldErrors(shippingData)
  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  const hasOptionalContact = shippingData.phone.trim().length > 0
  const hasCompanyDetails =
    shippingData.companyName.trim().length > 0 ||
    shippingData.vatId.trim().length > 0 ||
    shippingData.purchaseOrderRef.trim().length > 0
  const [showOptionalContact, setShowOptionalContact] = useState(hasOptionalContact)
  const [showCompanyFields, setShowCompanyFields] = useState(hasCompanyDetails)
  const canContinue =
    [shippingData.firstName, shippingData.lastName, shippingData.email, shippingData.street, shippingData.city, shippingData.zip].every(
      (value) => value.trim().length > 0,
    ) && !hasFieldErrors

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl">Lieferadresse</h2>
        <p className="mt-2 text-sm leading-7 text-brand-text-muted">
          Wir fragen nur die Angaben ab, die für Versand, Rückfragen und die korrekte Zustellung notwendig sind.
        </p>
      </div>

      <section className="rounded-[1.4rem] border border-brand-border bg-brand-bg p-4">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Kontakt</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Vorname"
            value={shippingData.firstName}
            autoComplete="given-name"
            onChange={(event) => onChange({ ...shippingData, firstName: event.target.value })}
            required
          />
          <Input
            label="Nachname"
            value={shippingData.lastName}
            autoComplete="family-name"
            onChange={(event) => onChange({ ...shippingData, lastName: event.target.value })}
            required
          />
          <Input
            label="E-Mail"
            type="email"
            value={shippingData.email}
            autoComplete="email"
            error={fieldErrors.email}
            onChange={(event) => onChange({ ...shippingData, email: event.target.value })}
            required
          />
        </div>
        <button
          type="button"
          onClick={() => setShowOptionalContact((current) => !current)}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-text-muted transition-colors hover:border-black/30 hover:text-black"
        >
          <ChevronDown className={['h-4 w-4 transition-transform', showOptionalContact ? 'rotate-180' : 'rotate-0'].join(' ')} />
          {showOptionalContact ? 'Telefon ausblenden' : 'Telefon hinzufügen'}
        </button>
        {showOptionalContact ? (
          <div className="mt-4 rounded-[1.2rem] border border-brand-border bg-white p-4">
            <Input
              label="Telefon"
              value={shippingData.phone}
              autoComplete="tel"
              inputMode="tel"
              hint="Optional, hilft nur bei Rückfragen zur Lieferung"
              error={fieldErrors.phone}
              onChange={(event) => onChange({ ...shippingData, phone: event.target.value })}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.4rem] border border-brand-border bg-white p-4">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-brand-text-muted">Adresse</p>
        <div className="space-y-4">
          <Input
            label="Straße und Hausnummer"
            value={shippingData.street}
            autoComplete="street-address"
            onChange={(event) => onChange({ ...shippingData, street: event.target.value })}
            required
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="PLZ"
              value={shippingData.zip}
              autoComplete="postal-code"
              inputMode="numeric"
              error={fieldErrors.zip}
              onChange={(event) => onChange({ ...shippingData, zip: event.target.value })}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Stadt"
                value={shippingData.city}
                autoComplete="address-level2"
                onChange={(event) => onChange({ ...shippingData, city: event.target.value })}
                required
              />
            </div>
          </div>
        </div>
      </section>

      {segment === 'b2b' ? (
        <section className="rounded-[1.4rem] border border-brand-border bg-brand-bg p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg">Firmenangaben</h3>
              <p className="mt-1 text-sm text-brand-text-muted">Optional für USt-Prüfung, Firma und interne Referenzen.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCompanyFields((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-text-muted transition-colors hover:border-black/30 hover:text-black"
            >
              <ChevronDown className={['h-4 w-4 transition-transform', showCompanyFields ? 'rotate-180' : 'rotate-0'].join(' ')} />
              {showCompanyFields ? 'Firmenangaben ausblenden' : 'Firmenangaben hinzufügen'}
            </button>
          </div>
          {showCompanyFields ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Firma"
                  value={shippingData.companyName}
                  onChange={(event) => onChange({ ...shippingData, companyName: event.target.value })}
                />
                <Input
                  label="USt-IdNr."
                  value={shippingData.vatId}
                  onChange={(event) => onChange({ ...shippingData, vatId: event.target.value })}
                />
              </div>
              <div className="mt-4">
                <Input
                  label="Bestellreferenz"
                  hint="z. B. interne PO-Nummer"
                  value={shippingData.purchaseOrderRef}
                  onChange={(event) => onChange({ ...shippingData, purchaseOrderRef: event.target.value })}
                />
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <Button onClick={onContinue} size="lg" fullWidth disabled={!canContinue}>
        Weiter zur Zahlung
      </Button>
    </div>
  )
}
