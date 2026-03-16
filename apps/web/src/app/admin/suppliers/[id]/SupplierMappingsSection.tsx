import { Download, Plus, Upload, Save, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { ProductMapping, SupplierDetail } from './types'

type SupplierMappingsSectionProps = {
  supplier: SupplierDetail | null
  mappings: ProductMapping[]
  savingMappings: boolean
  onAddMapping: () => void
  onUpdateMapping: (index: number, patch: Partial<ProductMapping>) => void
  onRemoveMapping: (index: number) => void
  onReplaceMappings: (next: ProductMapping[]) => void
  onSaveMappings: () => void
}

type ParsedMappings = {
  items: ProductMapping[]
  errors: string[]
}

function parseBool(value: string, fallback: boolean) {
  const v = value.trim().toLowerCase()
  if (!v) return fallback
  if (['1', 'true', 'yes', 'y', 'ja', 'on'].includes(v)) return true
  if (['0', 'false', 'no', 'n', 'nein', 'off'].includes(v)) return false
  return fallback
}

function parseNumber(value: string) {
  const raw = value.trim()
  if (!raw) return null
  const normalized = raw.includes('.') ? raw : raw.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseInteger(value: string) {
  const raw = value.trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function detectDelimiter(line: string) {
  const semicolons = (line.match(/;/g) || []).length
  const commas = (line.match(/,/g) || []).length
  return semicolons >= commas ? ';' : ','
}

function parseCSV(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"') {
      const next = input[i + 1]
      if (inQuotes && next === '"') {
        cell += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }

    if (!inQuotes && ch === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && ch === '\n') {
      row.push(cell)
      cell = ''
      if (row.some((value) => value.trim())) {
        rows.push(row)
      }
      row = []
      continue
    }

    cell += ch
  }

  row.push(cell)
  if (row.some((value) => value.trim())) {
    rows.push(row)
  }
  return rows
}

function parseMappingsCSV(text: string): ParsedMappings {
  const cleaned = text.replace(/^\uFEFF/, '').trim()
  if (!cleaned) return { items: [], errors: ['Datei ist leer.'] }

  const firstLine = cleaned.split(/\r?\n/, 1)[0] || ''
  const delimiter = detectDelimiter(firstLine)
  const rows = parseCSV(cleaned, delimiter)
  if (rows.length < 2) {
    return { items: [], errors: ['CSV enthaelt keine Datenzeilen.'] }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)

  const col = {
    product_id: idx('product_id'),
    priority: idx('priority'),
    is_primary: idx('is_primary'),
    is_active: idx('is_active'),
    supplier_sku: idx('supplier_sku'),
    cost_price: idx('cost_price'),
    cost_currency: idx('cost_currency'),
    cost_fx_rate_to_eur: idx('cost_fx_rate_to_eur'),
    lead_time_days: idx('lead_time_days'),
    reorder_min_stock: idx('reorder_min_stock'),
    reorder_target_stock: idx('reorder_target_stock'),
  }

  if (col.product_id === -1) {
    return { items: [], errors: ['Header muss mindestens "product_id" enthalten.'] }
  }

  const errors: string[] = []
  const items: ProductMapping[] = []
  const seen = new Set<string>()

  const cell = (row: string[], index: number) => (index >= 0 ? (row[index] || '').trim() : '')

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const productID = cell(row, col.product_id)
    if (!productID) {
      errors.push(`Zeile ${i + 1}: product_id fehlt.`)
      continue
    }
    if (seen.has(productID)) {
      errors.push(`Zeile ${i + 1}: product_id doppelt (${productID}).`)
      continue
    }
    seen.add(productID)

    const priority = parseInteger(cell(row, col.priority))
    const isPrimary = parseBool(cell(row, col.is_primary), false)
    const isActive = parseBool(cell(row, col.is_active), true)
    const supplierSKU = cell(row, col.supplier_sku)
    const costPrice = parseNumber(cell(row, col.cost_price))
    const costCurrency = cell(row, col.cost_currency) || 'EUR'
    const fxRate = parseNumber(cell(row, col.cost_fx_rate_to_eur))
    const leadTime = parseInteger(cell(row, col.lead_time_days))
    const reorderMin = parseInteger(cell(row, col.reorder_min_stock))
    const reorderTarget = parseInteger(cell(row, col.reorder_target_stock))

    items.push({
      product_id: productID,
      priority: priority ?? 100,
      is_primary: isPrimary,
      is_active: isActive,
      supplier_sku: supplierSKU || undefined,
      cost_price: costPrice ?? undefined,
      cost_currency: costCurrency,
      cost_fx_rate_to_eur: fxRate ?? (costCurrency === 'EUR' ? 1 : undefined),
      lead_time_days: leadTime ?? undefined,
      reorder_min_stock: reorderMin ?? undefined,
      reorder_target_stock: reorderTarget ?? undefined,
    })
  }

  return { items, errors }
}

export function SupplierMappingsSection({
  supplier,
  mappings,
  savingMappings,
  onAddMapping,
  onUpdateMapping,
  onRemoveMapping,
  onReplaceMappings,
  onSaveMappings,
}: SupplierMappingsSectionProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const downloadTemplate = () => {
    const headers = [
      'product_id',
      'priority',
      'is_primary',
      'is_active',
      'supplier_sku',
      'cost_price',
      'cost_currency',
      'cost_fx_rate_to_eur',
      'lead_time_days',
      'reorder_min_stock',
      'reorder_target_stock',
    ]
    const example = ['UUID_HERE', '100', 'false', 'true', 'SUP-001', '9.99', 'EUR', '1', '7', '0', '0']
    const csv = `${headers.join(';')}\n${example.join(';')}\n`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'supplier_product_mappings_template.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const importCSV = async (file: File) => {
    const text = await file.text()
    const parsed = parseMappingsCSV(text)
    if (parsed.errors.length > 0) {
      setImportErrors(parsed.errors.slice(0, 50))
      return
    }
    setImportErrors([])
    onReplaceMappings(parsed.items)
  }

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl">Produktzuordnung</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Hier entscheidet der Admin, welche Shop-Produkte der Supplier beliefern darf und mit welchen Konditionen.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void importCSV(file)
              event.target.value = ''
            }}
          />
          <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={downloadTemplate}>
            CSV Template
          </Button>
          <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            CSV Import
          </Button>
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={onAddMapping}>
            Zuordnung hinzufügen
          </Button>
        </div>
      </div>

      {importErrors.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">CSV Import Fehler</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">
            {importErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {mappings.map((mapping, index) => (
          <article key={`${mapping.product_id || 'new'}-${index}`} className="rounded-2xl border border-brand-border bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">
                Shop-Produkt ID
                <input
                  value={mapping.product_id}
                  onChange={(event) => onUpdateMapping(index, { product_id: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  placeholder="UUID des Shop-Produkts"
                />
              </label>

              <label className="text-sm">
                Supplier-SKU
                <input
                  value={mapping.supplier_sku || ''}
                  onChange={(event) => onUpdateMapping(index, { supplier_sku: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  placeholder="SKU beim Supplier"
                />
              </label>

              <label className="text-sm">
                Priorität
                <input
                  type="number"
                  value={mapping.priority ?? 100}
                  onChange={(event) => onUpdateMapping(index, { priority: Number(event.target.value || 0) })}
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <label className="text-sm">
                Lead Time (Tage)
                <input
                  type="number"
                  value={mapping.lead_time_days ?? ''}
                  onChange={(event) =>
                    onUpdateMapping(index, {
                      lead_time_days: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <label className="text-sm">
                EK-Preis
                <input
                  type="number"
                  step="0.01"
                  value={mapping.cost_price ?? ''}
                  onChange={(event) =>
                    onUpdateMapping(index, {
                      cost_price: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <label className="text-sm">
                EK-Währung
                <select
                  value={mapping.cost_currency || 'EUR'}
                  onChange={(event) => {
                    const nextCurrency = event.target.value
                    onUpdateMapping(index, {
                      cost_currency: nextCurrency,
                      cost_fx_rate_to_eur: nextCurrency === 'EUR' ? 1 : (mapping.cost_fx_rate_to_eur ?? 1),
                    })
                  }}
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>

              <label className="text-sm">
                FX Rate → EUR
                <input
                  type="number"
                  step="0.0001"
                  value={mapping.cost_fx_rate_to_eur ?? ''}
                  onChange={(event) =>
                    onUpdateMapping(index, {
                      cost_fx_rate_to_eur: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <label className="text-sm">
                Reorder-Min (Stock)
                <input
                  type="number"
                  value={mapping.reorder_min_stock ?? ''}
                  onChange={(event) =>
                    onUpdateMapping(index, {
                      reorder_min_stock: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <label className="text-sm">
                Reorder-Target (Stock)
                <input
                  type="number"
                  value={mapping.reorder_target_stock ?? ''}
                  onChange={(event) =>
                    onUpdateMapping(index, {
                      reorder_target_stock: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                />
              </label>

              <div className="flex flex-wrap items-end gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(mapping.is_primary)}
                    onChange={(event) => onUpdateMapping(index, { is_primary: event.target.checked })}
                  />
                  Primär
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={mapping.is_active !== false}
                    onChange={(event) => onUpdateMapping(index, { is_active: event.target.checked })}
                  />
                  Aktiv
                </label>
              </div>

              <div className="lg:col-span-2 xl:col-span-2">
                <p className="text-sm text-brand-text-muted">
                  {mapping.product_name || supplier?.products?.find((product) => product.id === mapping.product_id)?.name || 'Kein Produktname geladen'}
                  {mapping.product_sku ? ` · Shop-SKU ${mapping.product_sku}` : ''}
                </p>
                {typeof mapping.cost_price === 'number' && (mapping.cost_currency || 'EUR') ? (
                  <p className="mt-1 text-sm text-brand-text-muted">
                    EK (EUR):{' '}
                    <span className="font-semibold text-brand-text">
                      {((mapping.cost_fx_rate_to_eur ?? 1) * mapping.cost_price).toFixed(2)}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => onRemoveMapping(index)}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Entfernen
              </button>
            </div>
          </article>
        ))}

        {mappings.length === 0 ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Noch keine Produktzuordnung vorhanden. Sobald der Supplier verbunden ist, sollten hier die ersten Shop-Produkte hinterlegt werden.
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <Button leftIcon={<Save className="h-4 w-4" />} onClick={onSaveMappings} isLoading={savingMappings}>
          Produktzuordnungen speichern
        </Button>
      </div>
    </section>
  )
}
