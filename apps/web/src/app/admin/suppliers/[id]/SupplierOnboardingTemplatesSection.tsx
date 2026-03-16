import { Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'

type TemplatePatch = {
  supplier_fulfillment_mode?: string
  supplier_auto_fulfill_enabled?: boolean
  supplier_onboarding_status?: string
  supplier_compliance_state?: string
  execution_mode?: 'api' | 'browser' | 'hybrid'
  skill_id?: string
  dry_run?: boolean
}

type SupplierOnboardingTemplate = {
  id: string
  title: string
  description: string
  patch: TemplatePatch
}

type SupplierOnboardingTemplatesSectionProps = {
  supplierFulfillmentMode: string
  supplierAutoFulfillEnabled: boolean
  supplierOnboardingStatus: string
  supplierComplianceState: string
  executionMode: 'api' | 'browser' | 'hybrid'
  skillID: string
  dryRun: boolean
  onSupplierFulfillmentModeChange: (value: string) => void
  onSupplierAutoFulfillEnabledChange: (value: boolean) => void
  onSupplierOnboardingStatusChange: (value: string) => void
  onSupplierComplianceStateChange: (value: string) => void
  onExecutionModeChange: (mode: 'api' | 'browser' | 'hybrid') => void
  onSkillIDChange: (value: string) => void
  onDryRunChange: (value: boolean) => void
  onNotice?: (value: string | null) => void
}

const TEMPLATES: SupplierOnboardingTemplate[] = [
  {
    id: 'eu_email_hybrid',
    title: 'EU/DACH - Portal + E-Mail Fulfillment',
    description: 'Hybrid run + E-Mail Fulfillment. Gut fuer Supplier-Portale mit Captcha/2FA und manueller Bestellweitergabe.',
    patch: {
      supplier_fulfillment_mode: 'email',
      supplier_auto_fulfill_enabled: false,
      supplier_onboarding_status: 'applied',
      supplier_compliance_state: 'pending',
      execution_mode: 'hybrid',
      skill_id: 'supplier.onboarding.default',
      dry_run: true,
    },
  },
  {
    id: 'eu_api',
    title: 'EU/DACH - Direkt via API',
    description: 'API-only onboarding + API Fulfillment. Nutze das, wenn der Supplier einen stabilen Order-Endpoint hat.',
    patch: {
      supplier_fulfillment_mode: 'api',
      supplier_auto_fulfill_enabled: false,
      supplier_onboarding_status: 'applied',
      supplier_compliance_state: 'pending',
      execution_mode: 'api',
      skill_id: 'supplier.onboarding.default',
      dry_run: true,
    },
  },
  {
    id: 'intl_browser',
    title: 'International - Browser Onboarding',
    description: 'Browser-first fuer internationale Portale. Fail-safe fuer Redirects, OTP, Captcha. Fulfillment bleibt erstmal E-Mail.',
    patch: {
      supplier_fulfillment_mode: 'email',
      supplier_auto_fulfill_enabled: false,
      supplier_onboarding_status: 'applied',
      supplier_compliance_state: 'pending',
      execution_mode: 'browser',
      skill_id: 'supplier.onboarding.default',
      dry_run: true,
    },
  },
]

function formatPatchValue(value: unknown) {
  if (value === undefined) return null
  if (value === null) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function SupplierOnboardingTemplatesSection(props: SupplierOnboardingTemplatesSectionProps) {
  const [selectedTemplateID, setSelectedTemplateID] = useState(TEMPLATES[0]?.id ?? 'eu_email_hybrid')

  const selected = useMemo(() => {
    return TEMPLATES.find((t) => t.id === selectedTemplateID) || TEMPLATES[0]
  }, [selectedTemplateID])

  const applyTemplate = () => {
    if (!selected) return
    const patch = selected.patch

    if (patch.supplier_fulfillment_mode !== undefined) props.onSupplierFulfillmentModeChange(patch.supplier_fulfillment_mode)
    if (patch.supplier_auto_fulfill_enabled !== undefined) props.onSupplierAutoFulfillEnabledChange(patch.supplier_auto_fulfill_enabled)
    if (patch.supplier_onboarding_status !== undefined) props.onSupplierOnboardingStatusChange(patch.supplier_onboarding_status)
    if (patch.supplier_compliance_state !== undefined) props.onSupplierComplianceStateChange(patch.supplier_compliance_state)
    if (patch.execution_mode !== undefined) props.onExecutionModeChange(patch.execution_mode)
    if (patch.skill_id !== undefined) props.onSkillIDChange(patch.skill_id)
    if (patch.dry_run !== undefined) props.onDryRunChange(patch.dry_run)

    props.onNotice?.(`Template angewendet: ${selected.title}`)
  }

  const preview = selected?.patch

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xl">Onboarding-Templates</h2>
            <p className="mt-1 text-sm text-brand-text-muted">Ein Klick setzt sichere Default-Werte fuer Setup und Run-Konfiguration.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Template</span>
            <select
              value={selectedTemplateID}
              onChange={(event) => setSelectedTemplateID(event.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" onClick={applyTemplate}>
            Anwenden
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-3">
            <p className="text-sm font-semibold text-brand-text">{selected.title}</p>
            <p className="mt-1 text-sm text-brand-text-muted">{selected.description}</p>
          </div>

          <div className="rounded-2xl border border-brand-border bg-white px-4 py-3">
            <p className="text-sm font-semibold text-brand-text">Preview</p>
            <div className="mt-2 grid gap-1 text-sm text-brand-text-muted">
              <p>fulfillment_mode: {formatPatchValue(preview?.supplier_fulfillment_mode) ?? '-'}</p>
              <p>auto_fulfill_enabled: {formatPatchValue(preview?.supplier_auto_fulfill_enabled) ?? '-'}</p>
              <p>onboarding_status: {formatPatchValue(preview?.supplier_onboarding_status) ?? '-'}</p>
              <p>compliance_state: {formatPatchValue(preview?.supplier_compliance_state) ?? '-'}</p>
              <p>execution_mode: {formatPatchValue(preview?.execution_mode) ?? '-'}</p>
              <p>skill_id: {formatPatchValue(preview?.skill_id) ?? '-'}</p>
              <p>dry_run: {formatPatchValue(preview?.dry_run) ?? '-'}</p>
            </div>

            <div className="mt-3 rounded-2xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-xs text-brand-text-muted">
              <p>
                Aktuell: fulfillment={props.supplierFulfillmentMode}, execution={props.executionMode}, dry_run={props.dryRun ? 'true' : 'false'}
              </p>
              <p>
                Aktuell: onboarding={props.supplierOnboardingStatus}, compliance={props.supplierComplianceState}, auto={
                  props.supplierAutoFulfillEnabled ? 'true' : 'false'
                }
              </p>
              <p>Aktuell: skill={props.skillID}</p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
