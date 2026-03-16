import Link from '@/components/ui/Link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatStatusLabel, getNextSupplierAction, statusBadgeClass, supplierStatusTone } from '../supplier-ui'
import type { SupplierDetail } from './types'

type SupplierDetailHeaderProps = {
  supplierID: string
  supplier: SupplierDetail | null
  mappingCount: number
  loading: boolean
  onRefresh: () => void
}

export function SupplierDetailHeader({ supplierID, supplier, mappingCount, loading, onRefresh }: SupplierDetailHeaderProps) {
  const nextAction = getNextSupplierAction(supplier || {}, mappingCount)

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="max-w-3xl">
        <Link href="/admin/suppliers" className="inline-flex items-center gap-1 text-sm text-brand-text-muted hover:text-brand-text">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Liste
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-4xl">{supplier?.name || 'Supplier'}</h1>
          <span className={statusBadgeClass(supplierStatusTone(supplier?.status))}>{formatStatusLabel(supplier?.status)}</span>
        </div>
        <p className="mt-3 text-brand-text-muted">
          {nextAction.title}: {nextAction.detail}
        </p>
        <p className="mt-2 text-sm text-brand-text-muted">
          ID: <code>{supplierID}</code>
        </p>
      </div>
      <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={onRefresh} disabled={loading}>
        Aktualisieren
      </Button>
    </header>
  )
}
