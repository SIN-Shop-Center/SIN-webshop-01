import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatStatusLabel, hasFulfillmentChannel, hasRegistrationTarget } from '../supplier-ui'
import type { SupplierDetail } from './types'

type SupplierProfileSectionProps = {
  supplier: SupplierDetail | null
  mappingCount: number
  supplierStatus: string
  supplierOnboardingStatus: string
  supplierComplianceState: string
  complianceDocumentsReceived: boolean
  complianceTaxIDVerified: boolean
  complianceBankDetailsVerified: boolean
  supplierFulfillmentMode: string
  supplierAutoFulfillEnabled: boolean
  supplierRegistrationURL: string
  supplierPortalURL: string
  supplierContactEmail: string
  supplierAPIEndpoint: string
  specializationTags: string[]
  savingSupplier: boolean
  onSupplierStatusChange: (value: string) => void
  onSupplierOnboardingStatusChange: (value: string) => void
  onSupplierComplianceStateChange: (value: string) => void
  onComplianceDocumentsReceivedChange: (value: boolean) => void
  onComplianceTaxIDVerifiedChange: (value: boolean) => void
  onComplianceBankDetailsVerifiedChange: (value: boolean) => void
  onSupplierFulfillmentModeChange: (value: string) => void
  onSupplierAutoFulfillEnabledChange: (value: boolean) => void
  onSupplierRegistrationURLChange: (value: string) => void
  onSupplierPortalURLChange: (value: string) => void
  onSupplierContactEmailChange: (value: string) => void
  onSupplierAPIEndpointChange: (value: string) => void
  onSpecializationTagsChange: (value: string[]) => void
  onSave: () => void
}

export function SupplierProfileSection({
  supplier,
  mappingCount,
  supplierStatus,
  supplierOnboardingStatus,
  supplierComplianceState,
  complianceDocumentsReceived,
  complianceTaxIDVerified,
  complianceBankDetailsVerified,
  supplierFulfillmentMode,
  supplierAutoFulfillEnabled,
  supplierRegistrationURL,
  supplierPortalURL,
  supplierContactEmail,
  supplierAPIEndpoint,
  specializationTags,
  savingSupplier,
  onSupplierStatusChange,
  onSupplierOnboardingStatusChange,
  onSupplierComplianceStateChange,
  onComplianceDocumentsReceivedChange,
  onComplianceTaxIDVerifiedChange,
  onComplianceBankDetailsVerifiedChange,
  onSupplierFulfillmentModeChange,
  onSupplierAutoFulfillEnabledChange,
  onSupplierRegistrationURLChange,
  onSupplierPortalURLChange,
  onSupplierContactEmailChange,
  onSupplierAPIEndpointChange,
  onSpecializationTagsChange,
  onSave,
}: SupplierProfileSectionProps) {
  const draft = {
    status: supplierStatus,
    onboarding_status: supplierOnboardingStatus,
    compliance_state: supplierComplianceState,
    auto_fulfill_enabled: supplierAutoFulfillEnabled,
    registration_url: supplierRegistrationURL,
    portal_url: supplierPortalURL,
    contact_email: supplierContactEmail,
    api_endpoint: supplierAPIEndpoint,
    fulfillment_mode: supplierFulfillmentMode,
  }

  const checklist = [
    {
      label: 'Registrierungsziel',
      done: hasRegistrationTarget(draft),
      detail: 'Portal, Registration URL oder API-Ziel',
    },
    {
      label: 'Fulfillment-Kanal',
      done: hasFulfillmentChannel(draft),
      detail: supplierFulfillmentMode === 'api' ? 'API-Endpunkt gesetzt' : 'Kontakt-Mail oder API vorhanden',
    },
    {
      label: 'Produktzuordnung',
      done: mappingCount > 0,
      detail: mappingCount > 0 ? `${mappingCount} Produktzuordnungen vorhanden` : 'Noch keine Zuordnung gespeichert',
    },
    {
      label: 'Autopilot',
      done: supplierAutoFulfillEnabled,
      detail: supplierAutoFulfillEnabled ? 'Auto-Fulfillment aktiv' : 'Noch deaktiviert',
    },
  ]

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Setup & Freigabe</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Der Admin pflegt hier nur die operativ relevanten Felder für Registrierung, Compliance und spätere Bestell-Automation.
          </p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-sm text-brand-text-muted">
          <p>{supplier?.contact_person || supplier?.email || 'Kein Kontakt hinterlegt'}</p>
          <p className="mt-1">{supplier?.website || supplier?.portal_url || 'Keine Supplier-Website'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Supplier-Status
            <select
              value={supplierStatus}
              onChange={(event) => onSupplierStatusChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>

          <label className="text-sm">
            Onboarding
            <select
              value={supplierOnboardingStatus}
              onChange={(event) => onSupplierOnboardingStatusChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="new">New</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="applied">Applied</option>
              <option value="awaiting_access">Awaiting Access</option>
              <option value="connected">Connected</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="text-sm">
            Compliance
            <select
              value={supplierComplianceState}
              onChange={(event) => onSupplierComplianceStateChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="unchecked">Unchecked</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="blocked">Blocked</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="text-sm">
            Fulfillment-Modus
            <select
              value={supplierFulfillmentMode}
              onChange={(event) => onSupplierFulfillmentModeChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="email">E-Mail</option>
              <option value="api">API</option>
            </select>
          </label>

          <Input
            label="Kontakt-Mail"
            value={supplierContactEmail}
            onChange={(event) => onSupplierContactEmailChange(event.target.value)}
            placeholder="ops@supplier.com"
          />

          <Input
            label="API-Endpunkt"
            value={supplierAPIEndpoint}
            onChange={(event) => onSupplierAPIEndpointChange(event.target.value)}
            placeholder="https://supplier.example.com/orders"
          />

          <Input
            label="Registrierungs-URL"
            value={supplierRegistrationURL}
            onChange={(event) => onSupplierRegistrationURLChange(event.target.value)}
            placeholder="https://supplier.example.com/register"
          />

          <Input
            label="Portal-URL"
            value={supplierPortalURL}
            onChange={(event) => onSupplierPortalURLChange(event.target.value)}
            placeholder="https://supplier.example.com/portal"
          />

          <Input
            label="Spezialisierung (Tags, Komma-getrennt)"
            value={specializationTags.join(', ')}
            onChange={(event) =>
              onSpecializationTagsChange(
                event.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="fashion, electronics"
          />
        </div>

        <div className="rounded-2xl border border-brand-border bg-brand-bg-muted p-4">
          <p className="text-sm font-semibold text-brand-text">Readiness-Check</p>
          <div className="mt-3 space-y-3">
            {checklist.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/90 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-brand-text">{item.label}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {item.done ? 'OK' : 'Offen'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-brand-text-muted">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
            <p className="text-sm font-semibold text-brand-text">Compliance-Checklist</p>
            <p className="mt-1 text-sm text-brand-text-muted">
              Diese Punkte helfen bei der internen Freigabe, bevor der Supplier automatisiert Bestellungen bekommt.
            </p>
            <div className="mt-3 grid gap-2 text-sm text-brand-text">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={complianceDocumentsReceived}
                  onChange={(event) => onComplianceDocumentsReceivedChange(event.target.checked)}
                />
                Dokumente erhalten (AGB/Terms/Returns)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={complianceTaxIDVerified}
                  onChange={(event) => onComplianceTaxIDVerifiedChange(event.target.checked)}
                />
                Steuer-ID geprüft (USt-IdNr./Tax ID)
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={complianceBankDetailsVerified}
                  onChange={(event) => onComplianceBankDetailsVerifiedChange(event.target.checked)}
                />
                Bankdaten geprüft
              </label>
            </div>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-text">
            <input
              type="checkbox"
              checked={supplierAutoFulfillEnabled}
              onChange={(event) => onSupplierAutoFulfillEnabledChange(event.target.checked)}
            />
            Auto-Fulfillment aktivieren
          </label>
          <p className="mt-2 text-sm text-brand-text-muted">
            Empfohlen erst nach {formatStatusLabel(supplierOnboardingStatus)} und freigegebener Compliance.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Button leftIcon={<Save className="h-4 w-4" />} onClick={onSave} isLoading={savingSupplier}>
          Setup speichern
        </Button>
      </div>
    </section>
  )
}
