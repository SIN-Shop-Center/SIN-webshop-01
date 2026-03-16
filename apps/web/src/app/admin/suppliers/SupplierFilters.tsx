'use client'

import { Search } from 'lucide-react'

type SupplierFiltersProps = {
  search: string
  status: string
  country: string
  onboardingStatus: string
  complianceState: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCountryChange: (value: string) => void
  onOnboardingStatusChange: (value: string) => void
  onComplianceStateChange: (value: string) => void
}

export function SupplierFilters({
  search,
  status,
  country,
  onboardingStatus,
  complianceState,
  onSearchChange,
  onStatusChange,
  onCountryChange,
  onOnboardingStatusChange,
  onComplianceStateChange,
}: SupplierFiltersProps) {
  return (
    <section className="panel mb-4 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl">Fokussieren statt suchen</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Filtere nur nach den Signalen, die den nächsten operativen Schritt beeinflussen.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm">
          Supplier suchen
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Name, E-Mail, Website"
              className="w-full rounded-xl border border-brand-border bg-white px-9 py-2 text-sm focus:border-brand-accent focus:outline-none"
            />
          </div>
        </label>

        <label className="text-sm">
          Onboarding
          <select
            value={onboardingStatus}
            onChange={(event) => onOnboardingStatusChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
          >
            <option value="">Alle</option>
            <option value="new">Neu</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="applied">Registriert</option>
            <option value="awaiting_access">Awaiting Access</option>
            <option value="connected">Connected</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="text-sm">
          Compliance
          <select
            value={complianceState}
            onChange={(event) => onComplianceStateChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
          >
            <option value="">Alle</option>
            <option value="unchecked">Unchecked</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="blocked">Blocked</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="text-sm">
          Supplier-Status
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
          >
            <option value="">Alle</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>

        <label className="text-sm">
          Land
          <input
            value={country}
            onChange={(event) => onCountryChange(event.target.value)}
            placeholder="DE"
            className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm uppercase focus:border-brand-accent focus:outline-none"
          />
        </label>
      </div>
    </section>
  )
}
