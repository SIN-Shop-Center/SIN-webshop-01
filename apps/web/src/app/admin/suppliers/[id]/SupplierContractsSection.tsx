import { Download, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { SupplierContract } from './types'

type SupplierContractsSectionProps = {
  contracts: SupplierContract[]
  uploadingContract: boolean
  onUploadContract: (file: File, contractType: string, version?: string, expiresAt?: string) => Promise<void>
  onDownloadContract: (contractID: string) => void
}

const CONTRACT_TYPES = ['rahmenvertrag', 'nda', 'preisliste', 'sla', 'sonstiges']

export function SupplierContractsSection({
  contracts,
  uploadingContract,
  onUploadContract,
  onDownloadContract,
}: SupplierContractsSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [contractType, setContractType] = useState(CONTRACT_TYPES[0] || 'rahmenvertrag')
  const [version, setVersion] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const handleUpload = async () => {
    if (!selectedFile) return
    await onUploadContract(selectedFile, contractType, version, expiresAt || undefined)
    setIsAdding(false)
    setSelectedFile(null)
    setVersion('')
    setExpiresAt('')
  }

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Verträge & Dokumente</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Hier werden alle Verträge mit dem Supplier abgelegt (NDA, SLAs, Preislisten).
          </p>
        </div>
        <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setIsAdding(!isAdding)}>
          Neuen Vertrag hochladen
        </Button>
      </div>

      {isAdding ? (
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-bg-muted p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="text-sm">
              Datei
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-brand-bg-subtle file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-brand-bg"
              />
            </label>
            <label className="text-sm">
              Art des Vertrags
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              >
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Version / Notiz
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                placeholder="v1.0"
              />
            </label>
            <label className="text-sm">
              Ablaufdatum (optional)
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => void handleUpload()}
              isLoading={uploadingContract}
              disabled={!selectedFile || uploadingContract}
            >
              Hochladen
            </Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {contracts.map((contract) => {
          const expiresAt = contract.expires_at ? new Date(contract.expires_at) : null
          const createdAt = contract.created_at ? new Date(contract.created_at) : null
          const expiresAtValid = Boolean(expiresAt && !Number.isNaN(expiresAt.getTime()))
          const createdAtValid = Boolean(createdAt && !Number.isNaN(createdAt.getTime()))

          const now = new Date()
          const daysLeft = expiresAtValid ? Math.ceil((expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
          const showExpiryWarning = contract.status === 'active' && daysLeft !== null && daysLeft <= 30 && daysLeft >= 0

          return (
            <article key={contract.id} className="rounded-2xl border border-brand-border bg-white p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-brand-text">
                    {contract.contract_type} {contract.version ? `(${contract.version})` : ''}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-text-muted">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                        contract.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : contract.status === 'expired'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-brand-bg-subtle text-brand-text-muted'
                      }`}
                    >
                      {contract.status}
                    </span>
                    {showExpiryWarning ? (
                      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                        Ablauf in {daysLeft} Tagen
                      </span>
                    ) : null}
                    <span>Datei: {contract.file_name || 'unbekannt'}</span>
                    {contract.expires_at ? (
                      <span>Ablauf: {expiresAtValid ? expiresAt!.toLocaleDateString('de-DE') : '-'}</span>
                    ) : null}
                    <span>Hochgeladen: {createdAtValid ? createdAt!.toLocaleDateString('de-DE') : '-'}</span>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    leftIcon={<Download className="h-4 w-4" />}
                    onClick={() => onDownloadContract(contract.id)}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </article>
          )
        })}

        {contracts.length === 0 && !isAdding ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Keine Verträge vorhanden.
          </p>
        ) : null}
      </div>
    </section>
  )
}
