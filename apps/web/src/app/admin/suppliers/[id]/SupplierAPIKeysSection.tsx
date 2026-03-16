import { Key, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { SupplierAPIKey } from './types'

type SupplierAPIKeysSectionProps = {
  apiKeys: SupplierAPIKey[]
  creatingKey: boolean
  onCreateKey: (scopes: string[], metadata?: Record<string, unknown>) => Promise<void>
  onRevokeKey: (keyID: string) => Promise<void>
}

export function SupplierAPIKeysSection({
  apiKeys,
  creatingKey,
  onCreateKey,
  onRevokeKey,
}: SupplierAPIKeysSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [scopes, setScopes] = useState('webhook')
  const [note, setNote] = useState('')

  const handleCreate = async () => {
    const scopesList = scopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (scopesList.length === 0) return
    await onCreateKey(scopesList, { note })
    setIsAdding(false)
    setScopes('webhook')
    setNote('')
  }

  const activeKeys = apiKeys.filter((k) => !k.revoked_at)
  const revokedKeys = apiKeys.filter((k) => k.revoked_at)

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
            <Key className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-xl">API-Keys</h2>
            <p className="mt-1 text-sm text-brand-text-muted">Zugriffsschluessel fuer den Supplier (z.B. fuer Webhook Auth).</p>
          </div>
        </div>
        <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsAdding(!isAdding)}>
          Neuen Key erstellen
        </Button>
      </div>

      {isAdding ? (
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-bg-muted p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="text-sm">
              Scopes (kommagetrennt)
              <input
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                placeholder="webhook"
              />
            </label>
            <label className="text-sm">
              Notiz / Verwendung
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                placeholder="z.B. ERP-System"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => void handleCreate()} isLoading={creatingKey} disabled={creatingKey || !scopes.trim()}>
              Generieren
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {activeKeys.map((k) => (
          <article key={k.id} className="rounded-2xl border border-brand-border bg-white p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-brand-text">
                  sup_{k.key_prefix}_***
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-text-muted">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">Aktiv</span>
                  <span>Scopes: {k.scopes.join(', ')}</span>
                  <span>Erstellt: {k.created_at ? new Date(k.created_at).toLocaleDateString('de-DE') : '-'}</span>
                  {k.metadata?.note ? <span>Notiz: {String(k.metadata.note)}</span> : null}
                </div>
                {k.api_key ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">Key wurde generiert</p>
                    <p className="mt-1">Bitte sofort kopieren. Der Key wird nicht erneut angezeigt.</p>
                    <code className="mt-2 block break-all rounded bg-white px-2 py-1 font-mono text-xs">{k.api_key}</code>
                  </div>
                ) : null}
              </div>
              <div>
                <button
                  onClick={() => {
                    if (confirm('Key wirklich widerrufen? Zugriff entfaellt sofort.')) {
                      void onRevokeKey(k.id)
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Widerrufen
                </button>
              </div>
            </div>
          </article>
        ))}

        {revokedKeys.length > 0 ? (
          <details className="group mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand-text-muted">
              {revokedKeys.length} widerrufene Keys anzeigen
            </summary>
            <div className="mt-3 space-y-3">
              {revokedKeys.map((k) => (
                <div key={k.id} className="rounded-2xl border border-brand-border bg-brand-bg-muted p-4 opacity-75">
                  <p className="font-medium text-brand-text line-through">sup_{k.key_prefix}_***</p>
                  <p className="mt-1 text-xs text-brand-text-muted">
                    Widerrufen am {k.revoked_at ? new Date(k.revoked_at).toLocaleDateString('de-DE') : '-'}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {activeKeys.length === 0 && !isAdding ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Keine aktiven API-Keys.
          </p>
        ) : null}
      </div>
    </section>
  )
}
