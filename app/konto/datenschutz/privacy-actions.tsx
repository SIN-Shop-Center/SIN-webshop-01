'use client'

// Purpose: DSGVO Art. 17 + Art. 20 UI (Issue #43)
// Docs: app/lib/actions/privacy.ts

import { useState, useTransition } from 'react'
import { deleteMyAccount, exportMyData } from '@/app/lib/actions/privacy'

export function PrivacyActions() {
  const [confirmation, setConfirmation] = useState('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isExporting, startExport] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-lg border border-border p-6">
        <h2 className="mb-2 text-lg font-medium">Daten exportieren</h2>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          Du erhältst eine JSON-Datei mit deinem Profil, deinen Bestellungen
          und deiner Wunschliste. Der Link ist 7 Tage gültig.
        </p>
        {downloadUrl ? (
          <a
            href={downloadUrl}
            download
            className="text-sm underline underline-offset-4"
          >
            Export herunterladen (JSON)
          </a>
        ) : (
          <button
            type="button"
            disabled={isExporting}
            onClick={() =>
              startExport(async () => {
                try {
                  const { downloadUrl } = await exportMyData()
                  setDownloadUrl(downloadUrl ?? null)
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Export fehlgeschlagen',
                  )
                }
              })
            }
            className="btn btn-outline btn-md"
          >
            {isExporting ? 'Wird erstellt…' : 'Datenexport anfordern'}
          </button>
        )}
      </section>

      <section className="rounded-lg border border-destructive/40 p-6">
        <h2 className="mb-2 text-lg font-medium text-destructive">
          Konto löschen
        </h2>
        <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
          Dein Konto, Profil, Warenkorb und deine Wunschliste werden
          endgültig gelöscht. Bestelldaten werden anonymisiert (gesetzliche
          Aufbewahrungspflicht). Diese Aktion kann nicht rückgängig gemacht
          werden.
        </p>
        <label className="mb-3 flex flex-col gap-1 text-sm">
          Tippe LÖSCHEN zur Bestätigung
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="max-w-xs rounded-md border border-input bg-background px-3 py-2"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          disabled={confirmation !== 'LÖSCHEN' || isDeleting}
          onClick={() =>
            startDelete(async () => {
              try {
                await deleteMyAccount(confirmation)
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : 'Löschung fehlgeschlagen',
                )
              }
            })
          }
          className="btn btn-destructive btn-md"
        >
          {isDeleting ? 'Wird gelöscht…' : 'Konto endgültig löschen'}
        </button>
      </section>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
