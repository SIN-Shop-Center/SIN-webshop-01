import { ArrowUpRight, CheckCircle2, PlayCircle, TestTube2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatStatusLabel, statusBadgeClass } from '../supplier-ui'
import type { SupplierLatestRun } from './types'

type SupplierOnboardingSectionProps = {
  registrationURL?: string
  portalURL?: string
  latestRun?: SupplierLatestRun
  executionMode: 'api' | 'browser' | 'hybrid'
  skillID: string
  dryRun: boolean
  startingRun: boolean
  updatingRunStatus: boolean
  onExecutionModeChange: (mode: 'api' | 'browser' | 'hybrid') => void
  onSkillIDChange: (value: string) => void
  onDryRunChange: (value: boolean) => void
  onStartRun: (override?: { dryRun?: boolean }) => void
  onMarkAwaitingHuman: () => void
  onMarkConnected: () => void
  onMarkFailed: () => void
}

export function SupplierOnboardingSection({
  registrationURL,
  portalURL,
  latestRun,
  executionMode,
  skillID,
  dryRun,
  startingRun,
  updatingRunStatus,
  onExecutionModeChange,
  onSkillIDChange,
  onDryRunChange,
  onStartRun,
  onMarkAwaitingHuman,
  onMarkConnected,
  onMarkFailed,
}: SupplierOnboardingSectionProps) {
  const latestRunTone =
    latestRun?.status === 'succeeded'
      ? 'success'
      : latestRun?.status === 'failed' || latestRun?.status === 'cancelled'
        ? 'danger'
        : latestRun?.status === 'awaiting_human'
          ? 'warning'
          : latestRun?.status === 'running' || latestRun?.status === 'queued'
            ? 'info'
            : 'neutral'

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Registrierung</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Ein produktiver `Registrieren`-Klick startet den hybriden Run. Der Admin greift nur bei Verifikation oder Sonderfällen ein.
          </p>
        </div>
        {latestRun ? <span className={statusBadgeClass(latestRunTone)}>{formatStatusLabel(latestRun.status)}</span> : null}
      </div>

      <div className="mt-4 grid gap-2">
        <Button leftIcon={<PlayCircle className="h-4 w-4" />} onClick={() => onStartRun({ dryRun: false })} isLoading={startingRun}>
          Registrieren
        </Button>
        <Button variant="outline" leftIcon={<TestTube2 className="h-4 w-4" />} onClick={() => onStartRun({ dryRun: true })} disabled={startingRun}>
          Dry-Run testen
        </Button>
      </div>

      {latestRun?.status === 'awaiting_human' ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Admin-Aktion erforderlich</p>
          <p className="mt-1 text-amber-800">
            Öffne die Registrierungsseite oder das Supplier-Portal, schließe Login/Captcha/2FA ab und markiere den Run danach als verbunden.
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={onMarkConnected} isLoading={updatingRunStatus}>
          Als verbunden markieren
        </Button>
        <Button variant="outline" onClick={onMarkAwaitingHuman} disabled={updatingRunStatus}>
          Wartet auf Admin
        </Button>
        <Button variant="danger" leftIcon={<XCircle className="h-4 w-4" />} onClick={onMarkFailed} isLoading={updatingRunStatus}>
          Als fehlgeschlagen markieren
        </Button>
      </div>

      {(registrationURL || portalURL) ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {registrationURL ? (
            <a
              href={registrationURL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-bg-muted px-4 py-2.5 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
            >
              Registrierungsseite öffnen
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
          {portalURL ? (
            <a
              href={portalURL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-border bg-brand-bg-muted px-4 py-2.5 text-sm font-semibold text-brand-text transition hover:border-brand-accent"
            >
              Supplier-Portal öffnen
              <ArrowUpRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      ) : null}

      <details className="mt-4 rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand-text">Erweiterte Run-Einstellungen</summary>

        <div className="mt-3 grid gap-3">
          <label className="text-sm">
            Execution Mode
            <select
              value={executionMode}
              onChange={(event) => onExecutionModeChange(event.target.value as 'api' | 'browser' | 'hybrid')}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="hybrid">hybrid</option>
              <option value="api">api</option>
              <option value="browser">browser</option>
            </select>
          </label>

          <label className="text-sm">
            Skill ID
            <input
              value={skillID}
              onChange={(event) => onSkillIDChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(event) => onDryRunChange(event.target.checked)} />
            Dry Run als Standard setzen
          </label>
        </div>
      </details>
    </section>
  )
}
