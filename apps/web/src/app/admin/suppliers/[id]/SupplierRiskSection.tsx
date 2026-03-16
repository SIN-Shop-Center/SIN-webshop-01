import { ShieldAlert, ShieldCheck, ShieldHalf } from 'lucide-react'
import { useMemo } from 'react'
import type { SupplierContract, SupplierDetail, SupplierPerformance } from './types'

type RiskFactor = {
  key: string
  label: string
  points: number
  detail?: string
}

type SupplierRiskSectionProps = {
  supplier: SupplierDetail | null
  contracts: SupplierContract[]
  performance: SupplierPerformance | null
  mappingCount: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function daysUntil(dateLike?: string) {
  if (!dateLike) return null
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function badgeClass(score: number) {
  if (score >= 80) return 'bg-red-50 text-red-700'
  if (score >= 50) return 'bg-amber-50 text-amber-800'
  if (score >= 20) return 'bg-sky-50 text-sky-800'
  return 'bg-emerald-50 text-emerald-700'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'kritisch'
  if (score >= 50) return 'hoch'
  if (score >= 20) return 'mittel'
  return 'niedrig'
}

export function SupplierRiskSection({ supplier, contracts, performance, mappingCount }: SupplierRiskSectionProps) {
  const computed = useMemo(() => {
    const factors: RiskFactor[] = []

    const complianceState = (supplier?.compliance_state || 'unchecked').toLowerCase()
    const onboardingStatus = (supplier?.onboarding_status || 'new').toLowerCase()
    const fulfillmentMode = (supplier?.fulfillment_mode || 'email').toLowerCase()
    const autoFulfill = Boolean(supplier?.auto_fulfill_enabled)

    const metadata = supplier?.metadata && typeof supplier.metadata === 'object' ? (supplier.metadata as Record<string, unknown>) : {}
    const checklistRaw = metadata['compliance_checklist']
    const checklist = checklistRaw && typeof checklistRaw === 'object' ? (checklistRaw as Record<string, unknown>) : {}
    const docsReceived = Boolean(checklist['documents_received'])
    const taxVerified = Boolean(checklist['tax_id_verified'])
    const bankVerified = Boolean(checklist['bank_details_verified'])

    if (complianceState === 'blocked' || complianceState === 'rejected') {
      factors.push({ key: 'compliance_blocked', label: 'Compliance blockiert/abgelehnt', points: 60 })
    } else if (complianceState === 'unchecked') {
      factors.push({ key: 'compliance_unchecked', label: 'Compliance ungeprueft', points: 20 })
    } else if (complianceState === 'pending') {
      factors.push({ key: 'compliance_pending', label: 'Compliance in Pruefung', points: 10 })
    }

    if (!docsReceived) factors.push({ key: 'docs_missing', label: 'Dokumente fehlen', points: 10, detail: 'AGB/Terms/Returns nicht bestaetigt' })
    if (!taxVerified) factors.push({ key: 'tax_missing', label: 'Steuer-ID nicht geprueft', points: 10 })
    if (!bankVerified) factors.push({ key: 'bank_missing', label: 'Bankdaten nicht geprueft', points: 10 })

    if (onboardingStatus !== 'connected') {
      factors.push({ key: 'not_connected', label: 'Onboarding nicht abgeschlossen', points: 15, detail: `status=${onboardingStatus}` })
    }

    if (mappingCount === 0) {
      factors.push({ key: 'no_mappings', label: 'Keine Produktzuordnung', points: 10 })
    }

    const activeContracts = contracts.filter((c) => (c.status || '').toLowerCase() === 'active')
    if (activeContracts.length === 0) {
      factors.push({ key: 'no_contracts', label: 'Keine aktiven Vertraege', points: 15 })
    }
    const soonestExpiry = activeContracts
      .map((c) => ({ contract: c, days: daysUntil(c.expires_at) }))
      .filter((v) => v.days !== null)
      .sort((a, b) => (a.days as number) - (b.days as number))[0]
    if (soonestExpiry?.days !== null) {
      const days = soonestExpiry.days as number
      if (days < 0) {
        factors.push({ key: 'contract_expired', label: 'Vertrag abgelaufen', points: 25, detail: `${soonestExpiry.contract.contract_type}` })
      } else if (days <= 7) {
        factors.push({ key: 'contract_expiring_7', label: 'Vertrag laeuft bald ab', points: 20, detail: `in ${days} Tagen` })
      } else if (days <= 30) {
        factors.push({ key: 'contract_expiring_30', label: 'Vertrag laeuft demnaechst ab', points: 10, detail: `in ${days} Tagen` })
      }
    }

    const onTimeRate = performance?.metrics?.on_time_rate
    if (onTimeRate !== undefined && onTimeRate !== null && onTimeRate < 0.9) {
      factors.push({
        key: 'on_time_low',
        label: 'Lieferzuverlaessigkeit niedrig',
        points: 10,
        detail: `on_time_rate=${Math.round(onTimeRate * 100)}%`,
      })
    }

    const failed = performance?.metrics?.failed
    if (failed !== undefined && failed !== null && failed > 0) {
      factors.push({ key: 'failed_orders', label: 'Fehlgeschlagene Supplier Orders', points: 10, detail: `failed=${failed}` })
    }

    if (autoFulfill && complianceState !== 'approved') {
      factors.push({
        key: 'auto_without_compliance',
        label: 'Auto-Fulfillment ohne Compliance-Freigabe',
        points: 25,
        detail: `compliance=${complianceState}`,
      })
    }

    if (fulfillmentMode === 'api' && !(supplier?.api_endpoint || '').trim()) {
      factors.push({ key: 'api_missing', label: 'API-Fulfillment ohne Endpoint', points: 15 })
    }

    const shippingDays = supplier?.shipping_time_days
    if (shippingDays !== undefined && shippingDays !== null && shippingDays >= 14) {
      factors.push({ key: 'shipping_slow', label: 'Lange Lieferzeit', points: 10, detail: `${shippingDays} Tage` })
    }

    const country = (supplier?.country || '').toUpperCase().trim()
    if (country && !['DE', 'AT', 'CH', 'NL', 'BE', 'FR', 'IT', 'ES', 'PL', 'CZ', 'DK', 'SE', 'NO', 'FI', 'PT', 'IE', 'LU'].includes(country)) {
      factors.push({ key: 'geo_risk', label: 'Geografisches Risiko', points: 5, detail: `country=${country}` })
    }

    const rawScore = factors.reduce((sum, factor) => sum + factor.points, 0)
    const score = clamp(rawScore, 0, 100)
    return { score, factors }
  }, [contracts, mappingCount, performance, supplier])

  const Icon = computed.score >= 50 ? ShieldAlert : computed.score >= 20 ? ShieldHalf : ShieldCheck

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xl">Supplier Risk</h2>
            <p className="mt-1 text-sm text-brand-text-muted">Heuristik aus Compliance, Vertraegen, Performance und Setup.</p>
          </div>
        </div>
        <div className={`rounded-full px-3 py-1.5 text-sm font-semibold ${badgeClass(computed.score)}`}>
          {scoreLabel(computed.score)} ({computed.score}/100)
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {computed.factors.length === 0 ? (
          <p className="rounded-2xl border border-brand-border bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Keine Risikofaktoren erkannt.</p>
        ) : (
          computed.factors.map((factor) => (
            <div key={factor.key} className="rounded-2xl border border-brand-border bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-brand-text">{factor.label}</p>
                <span className="rounded-full bg-brand-bg-muted px-2.5 py-1 text-xs font-semibold text-brand-text-muted">+{factor.points}</span>
              </div>
              {factor.detail ? <p className="mt-1 text-sm text-brand-text-muted">{factor.detail}</p> : null}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
