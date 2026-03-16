'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAuthHeaders } from '@/lib/api/auth'
import {
  AutomationHealth,
  CredentialsResponse,
  ListEnvelope,
  OnboardingRun,
  ProductMapping,
  RunDetail,
  SupplierCatalogProduct,
  SupplierContract,
  SupplierAuditLogEntry,
  SupplierCommunication,
  SupplierAPIKey,
  SupplierDetail,
  SupplierPerformance,
  SupplierPerformanceResponse,
  SupplierResponse,
  prettyJSON,
} from './types'

type LoadOptions = {
  keepSelectedRun?: boolean
}

export function useSupplierDetailState(supplierID: string) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null)
  const [runs, setRuns] = useState<OnboardingRun[]>([])
  const [selectedRunID, setSelectedRunID] = useState<string | null>(null)
  const [runDetail, setRunDetail] = useState<RunDetail | null>(null)
  const [automationHealth, setAutomationHealth] = useState<AutomationHealth | null>(null)
  const [performance, setPerformance] = useState<SupplierPerformance | null>(null)

  const [credentialsProvider, setCredentialsProvider] = useState('supplier_portal')
  const [credentialsUsername, setCredentialsUsername] = useState('')
  const [credentialsSecret, setCredentialsSecret] = useState('')
  const [credentialsMetadata, setCredentialsMetadata] = useState('{}')
  const [hasSecret, setHasSecret] = useState(false)

  const [supplierStatus, setSupplierStatus] = useState('pending')
  const [supplierOnboardingStatus, setSupplierOnboardingStatus] = useState('new')
  const [supplierComplianceState, setSupplierComplianceState] = useState('unchecked')
  const [complianceDocumentsReceived, setComplianceDocumentsReceived] = useState(false)
  const [complianceTaxIDVerified, setComplianceTaxIDVerified] = useState(false)
  const [complianceBankDetailsVerified, setComplianceBankDetailsVerified] = useState(false)
  const [supplierFulfillmentMode, setSupplierFulfillmentMode] = useState('email')
  const [supplierAutoFulfillEnabled, setSupplierAutoFulfillEnabled] = useState(false)
  const [slaAckHours, setSlaAckHours] = useState(24)
  const [slaFulfillmentHours, setSlaFulfillmentHours] = useState(72)
  const [paymentTermsDays, setPaymentTermsDays] = useState(30)
  const [earlyPaymentDiscountPct, setEarlyPaymentDiscountPct] = useState<number | null>(null)
  const [earlyPaymentDiscountDays, setEarlyPaymentDiscountDays] = useState<number | null>(null)
  const [supplierRegistrationURL, setSupplierRegistrationURL] = useState('')
  const [supplierPortalURL, setSupplierPortalURL] = useState('')
  const [supplierContactEmail, setSupplierContactEmail] = useState('')
  const [supplierAPIEndpoint, setSupplierAPIEndpoint] = useState('')
  const [specializationTags, setSpecializationTags] = useState<string[]>([])

  const [executionMode, setExecutionMode] = useState<'api' | 'browser' | 'hybrid'>('hybrid')
  const [skillID, setSkillID] = useState('supplier.onboarding.default')
  const [dryRun, setDryRun] = useState(false)

  const [mappings, setMappings] = useState<ProductMapping[]>([])
  const [catalogProducts, setCatalogProducts] = useState<SupplierCatalogProduct[]>([])
  const [contracts, setContracts] = useState<SupplierContract[]>([])
  const [communications, setCommunications] = useState<SupplierCommunication[]>([])
  const [auditLog, setAuditLog] = useState<SupplierAuditLogEntry[]>([])
  const [apiKeys, setApiKeys] = useState<SupplierAPIKey[]>([])

  const [savingCredentials, setSavingCredentials] = useState(false)
  const [savingMappings, setSavingMappings] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [startingRun, setStartingRun] = useState(false)
  const [updatingRunStatus, setUpdatingRunStatus] = useState(false)
  const [importingCatalogProductID, setImportingCatalogProductID] = useState<string | null>(null)
  const [syncingCatalog, setSyncingCatalog] = useState(false)
  const [uploadingContract, setUploadingContract] = useState(false)
  const [sendingCommunication, setSendingCommunication] = useState(false)
  const [creatingKey, setCreatingKey] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const applySupplierState = useCallback((nextSupplier: SupplierDetail | null) => {
    setSupplier(nextSupplier)
    setSupplierStatus(nextSupplier?.status || 'pending')
    setSupplierOnboardingStatus(nextSupplier?.onboarding_status || 'new')
    setSupplierComplianceState(nextSupplier?.compliance_state || 'unchecked')

    const metadata = nextSupplier?.metadata && typeof nextSupplier.metadata === 'object' ? (nextSupplier.metadata as Record<string, unknown>) : {}
    const checklistRaw = metadata['compliance_checklist']
    const checklist = checklistRaw && typeof checklistRaw === 'object' ? (checklistRaw as Record<string, unknown>) : {}
    setComplianceDocumentsReceived(Boolean(checklist['documents_received']))
    setComplianceTaxIDVerified(Boolean(checklist['tax_id_verified']))
    setComplianceBankDetailsVerified(Boolean(checklist['bank_details_verified']))

    setSupplierFulfillmentMode(nextSupplier?.fulfillment_mode || 'email')
    setSupplierAutoFulfillEnabled(Boolean(nextSupplier?.auto_fulfill_enabled))
    setSlaAckHours(nextSupplier?.sla_ack_hours || 24)
    setSlaFulfillmentHours(nextSupplier?.sla_fulfillment_hours || 72)
    setPaymentTermsDays(nextSupplier?.payment_terms_days || 30)
    setEarlyPaymentDiscountPct(nextSupplier?.early_payment_discount_pct ?? null)
    setEarlyPaymentDiscountDays(nextSupplier?.early_payment_discount_days ?? null)
    setSupplierRegistrationURL(nextSupplier?.registration_url || '')
    setSupplierPortalURL(nextSupplier?.portal_url || '')
    setSupplierContactEmail(nextSupplier?.contact_email || nextSupplier?.email || '')
    setSupplierAPIEndpoint(nextSupplier?.api_endpoint || '')
    setSpecializationTags(nextSupplier?.specialization_tags || [])
  }, [])

  const loadAll = useCallback(
    async (options: LoadOptions = {}) => {
      if (!supplierID) {
        return
      }

      setLoading(true)
      setError(null)
      try {
        const headers = await getAuthHeaders()
        const [
          supplierRes,
          credentialsRes,
          mappingsRes,
          catalogRes,
          runsRes,
          automationRes,
          performanceRes,
          contractsRes,
          commsRes,
          auditRes,
          apiKeysRes,
        ] = await Promise.all([
          fetch(`/api/admin/suppliers/${supplierID}`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/credentials`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/product-mappings?limit=200`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/catalog-products?limit=100`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/onboarding/runs?limit=20`, { cache: 'no-store', headers }),
          fetch('/api/admin/automation/health', { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/performance?window_days=30`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/contracts?limit=50`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/communications?limit=100`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/audit-log?limit=100`, { cache: 'no-store', headers }),
          fetch(`/api/admin/suppliers/${supplierID}/api-keys?limit=100`, { cache: 'no-store', headers }),
        ])

        if (!supplierRes.ok) throw new Error(`supplier_fetch_failed:${supplierRes.status}`)
        if (!credentialsRes.ok) throw new Error(`credentials_fetch_failed:${credentialsRes.status}`)
        if (!mappingsRes.ok) throw new Error(`mappings_fetch_failed:${mappingsRes.status}`)
        if (!catalogRes.ok) throw new Error(`catalog_fetch_failed:${catalogRes.status}`)
        if (!runsRes.ok) throw new Error(`runs_fetch_failed:${runsRes.status}`)
        if (!automationRes.ok) throw new Error(`automation_health_fetch_failed:${automationRes.status}`)

        const supplierPayload = (await supplierRes.json()) as SupplierResponse
        const credentialsPayload = (await credentialsRes.json()) as CredentialsResponse
        const mappingsPayload = (await mappingsRes.json()) as ListEnvelope<Record<string, unknown>>
        const catalogPayload = (await catalogRes.json()) as ListEnvelope<SupplierCatalogProduct>
        const runsPayload = (await runsRes.json()) as ListEnvelope<OnboardingRun>
        const automationPayload = (await automationRes.json()) as AutomationHealth

        let performancePayload: SupplierPerformanceResponse | null = null
        if (performanceRes.ok) {
          performancePayload = (await performanceRes.json()) as SupplierPerformanceResponse
        }

        let contractsPayload: ListEnvelope<SupplierContract> | null = null
        if (contractsRes.ok) {
          contractsPayload = (await contractsRes.json()) as ListEnvelope<SupplierContract>
        }

        let communicationsPayload: ListEnvelope<SupplierCommunication> | null = null
        if (commsRes.ok) {
          communicationsPayload = (await commsRes.json()) as ListEnvelope<SupplierCommunication>
        }

        let auditPayload: ListEnvelope<SupplierAuditLogEntry> | null = null
        if (auditRes.ok) {
          auditPayload = (await auditRes.json()) as ListEnvelope<SupplierAuditLogEntry>
        }

        let apiKeysPayload: ListEnvelope<SupplierAPIKey> | null = null
        if (apiKeysRes.ok) {
          apiKeysPayload = (await apiKeysRes.json()) as ListEnvelope<SupplierAPIKey>
        }

        const nextSupplier = supplierPayload.data || null
        applySupplierState(nextSupplier)
        setAutomationHealth(automationPayload || null)
        setPerformance(performancePayload?.data || null)
        setContracts(contractsPayload?.data?.items || [])
        setCommunications(communicationsPayload?.data?.items || [])
        setAuditLog(auditPayload?.data?.items || [])
        setApiKeys(apiKeysPayload?.data?.items || [])

        const creds = credentialsPayload.data || {}
        setCredentialsProvider(creds.provider || 'supplier_portal')
        setCredentialsUsername(creds.username || '')
        setCredentialsMetadata(prettyJSON(creds.metadata || {}, '{}'))
        setHasSecret(Boolean(creds.has_secret))

        const mappingItems = (mappingsPayload.data?.items || []).map((item) => ({
          product_id: String(item.product_id || ''),
          product_name: item.product_name ? String(item.product_name) : '',
          product_sku: item.product_sku ? String(item.product_sku) : '',
          priority: Number(item.priority || 100),
          is_primary: Boolean(item.is_primary),
          is_active: item.is_active !== false,
          supplier_sku: item.supplier_sku ? String(item.supplier_sku) : '',
          cost_price: item.cost_price !== undefined && item.cost_price !== null ? Number(item.cost_price) : undefined,
          cost_currency: item.cost_currency ? String(item.cost_currency) : 'EUR',
          cost_fx_rate_to_eur:
            item.cost_fx_rate_to_eur !== undefined && item.cost_fx_rate_to_eur !== null ? Number(item.cost_fx_rate_to_eur) : undefined,
          lead_time_days: item.lead_time_days !== undefined && item.lead_time_days !== null ? Number(item.lead_time_days) : undefined,
          reorder_min_stock: item.reorder_min_stock !== undefined && item.reorder_min_stock !== null ? Number(item.reorder_min_stock) : undefined,
          reorder_target_stock:
            item.reorder_target_stock !== undefined && item.reorder_target_stock !== null ? Number(item.reorder_target_stock) : undefined,
        }))
        setMappings(mappingItems)
        setCatalogProducts(catalogPayload.data?.items || [])

        const runItems = runsPayload.data?.items || []
        setRuns(runItems)
        setSelectedRunID((current) => {
          if (options.keepSelectedRun && current && runItems.some((item) => item.id === current)) {
            return current
          }
          return runItems[0]?.id || null
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'fetch_failed')
      } finally {
        setLoading(false)
      }
    },
    [supplierID, applySupplierState],
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const loadRunDetail = useCallback(async () => {
    if (!supplierID || !selectedRunID) {
      setRunDetail(null)
      return
    }

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/admin/suppliers/${supplierID}/onboarding/runs/${selectedRunID}`, {
        cache: 'no-store',
        headers,
      })
      if (!response.ok) throw new Error(`run_detail_fetch_failed:${response.status}`)
      const payload = (await response.json()) as { data?: RunDetail }
      setRunDetail(payload.data || null)
    } catch (err) {
      console.error('Failed to load run detail:', err)
    }
  }, [selectedRunID, supplierID])

  useEffect(() => {
    void loadRunDetail()
  }, [loadRunDetail])

  const saveCredentials = async () => {
    if (!supplierID) return
    setSavingCredentials(true)
    setError(null)
    setNotice(null)
    try {
      const metadata = credentialsMetadata.trim() ? JSON.parse(credentialsMetadata) : {}
      const response = await fetch(`/api/admin/suppliers/${supplierID}/credentials`, {
        method: 'PUT',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          provider: credentialsProvider.trim() || 'supplier_portal',
          username: credentialsUsername.trim(),
          secret: credentialsSecret || undefined,
          metadata,
        }),
      })
      if (!response.ok) throw new Error(`credentials_save_failed:${response.status}`)
      setCredentialsSecret('')
      await loadAll({ keepSelectedRun: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'credentials_save_failed')
    } finally {
      setSavingCredentials(false)
    }
  }

  const saveMappings = async () => {
    if (!supplierID) return
    setSavingMappings(true)
    setError(null)
    setNotice(null)
    try {
      const payload = mappings
        .filter((item) => item.product_id.trim())
        .map((item) => ({
          product_id: item.product_id.trim(),
          priority: item.priority ?? 100,
          is_primary: Boolean(item.is_primary),
          is_active: item.is_active !== false,
          supplier_sku: item.supplier_sku?.trim() || undefined,
          cost_price: item.cost_price ?? undefined,
          cost_currency: item.cost_currency?.trim() || undefined,
          cost_fx_rate_to_eur: item.cost_fx_rate_to_eur ?? undefined,
          lead_time_days: item.lead_time_days ?? undefined,
          reorder_min_stock: item.reorder_min_stock ?? undefined,
          reorder_target_stock: item.reorder_target_stock ?? undefined,
        }))

      const response = await fetch(`/api/admin/suppliers/${supplierID}/product-mappings`, {
        method: 'PUT',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ items: payload }),
      })
      if (!response.ok) throw new Error(`mappings_save_failed:${response.status}`)
      await loadAll({ keepSelectedRun: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'mappings_save_failed')
    } finally {
      setSavingMappings(false)
    }
  }

  const saveSupplierSetup = async () => {
    if (!supplierID) return
    setSavingSupplier(true)
    setError(null)
    setNotice(null)
    try {
      const baseMetadata = supplier?.metadata && typeof supplier.metadata === 'object' ? (supplier.metadata as Record<string, unknown>) : {}
      const existingChecklistRaw = baseMetadata['compliance_checklist']
      const existingChecklist = existingChecklistRaw && typeof existingChecklistRaw === 'object' ? (existingChecklistRaw as Record<string, unknown>) : {}
      const metadata = {
        ...baseMetadata,
        compliance_checklist: {
          ...existingChecklist,
          documents_received: complianceDocumentsReceived,
          tax_id_verified: complianceTaxIDVerified,
          bank_details_verified: complianceBankDetailsVerified,
        },
      }

      const response = await fetch(`/api/admin/suppliers/${supplierID}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          status: supplierStatus,
          onboarding_status: supplierOnboardingStatus,
          compliance_state: supplierComplianceState,
          fulfillment_mode: supplierFulfillmentMode,
          auto_fulfill_enabled: supplierAutoFulfillEnabled,
          sla_ack_hours: slaAckHours,
          sla_fulfillment_hours: slaFulfillmentHours,
          payment_terms_days: paymentTermsDays,
          early_payment_discount_pct: earlyPaymentDiscountPct,
          early_payment_discount_days: earlyPaymentDiscountDays,
          registration_url: supplierRegistrationURL.trim() || null,
          portal_url: supplierPortalURL.trim() || null,
          contact_email: supplierContactEmail.trim() || null,
          api_endpoint: supplierAPIEndpoint.trim() || null,
          specialization_tags: specializationTags,
          metadata,
        }),
      })
      if (!response.ok) throw new Error(`supplier_save_failed:${response.status}`)
      await loadAll({ keepSelectedRun: true })
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'supplier_save_failed')
    } finally {
      setSavingSupplier(false)
    }
  }

  const startRun = async (override?: { dryRun?: boolean }) => {
    if (!supplierID) return
    setStartingRun(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/onboarding/runs`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          execution_mode: executionMode,
          skill_id: skillID,
          dry_run: override?.dryRun ?? dryRun,
        }),
      })
      if (!response.ok) throw new Error(`run_start_failed:${response.status}`)
      setNotice('Supplier-Registrierung wurde gestartet.')
      await loadAll({ keepSelectedRun: false })
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'run_start_failed')
    } finally {
      setStartingRun(false)
    }
  }

  const patchRunStatus = async (status: 'awaiting_human' | 'succeeded' | 'failed', lastError?: string) => {
    if (!supplierID) return
    const runID = selectedRunID || supplier?.latest_run?.id
    if (!runID) return

    setUpdatingRunStatus(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/onboarding/runs/${runID}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          status,
          last_error: lastError,
        }),
      })
      if (!response.ok) throw new Error(`run_patch_failed:${response.status}`)
      setNotice('Run-Status wurde aktualisiert.')
      await loadAll({ keepSelectedRun: true })
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'run_patch_failed')
    } finally {
      setUpdatingRunStatus(false)
    }
  }

  const importCatalogProduct = async (catalogProductID: string) => {
    if (!supplierID || !catalogProductID) return
    setImportingCatalogProductID(catalogProductID)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/catalog-products/${catalogProductID}/import`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error(`catalog_import_failed:${response.status}`)
      setNotice('Produkt wurde in den Shop importiert.')
      await loadAll({ keepSelectedRun: true })
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'catalog_import_failed')
    } finally {
      setImportingCatalogProductID(null)
    }
  }

  const syncCatalog = async () => {
    if (!supplierID) return
    setSyncingCatalog(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/catalog-products/sync`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error(`catalog_sync_failed:${response.status}`)
      setNotice('Katalog-Sync wurde angefordert. Neue Supplier-Produkte erscheinen nach Abschluss automatisch in dieser Liste.')
      await loadAll({ keepSelectedRun: true })
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'catalog_sync_failed')
    } finally {
      setSyncingCatalog(false)
    }
  }

  const addMapping = () => {
    setMappings((current) => [
      ...current,
      {
        product_id: '',
        product_name: '',
        product_sku: '',
        priority: current.length + 1,
        is_primary: current.length === 0,
        is_active: true,
        supplier_sku: '',
        cost_currency: 'EUR',
        cost_fx_rate_to_eur: 1,
      },
    ])
  }

  const updateMapping = (index: number, patch: Partial<ProductMapping>) => {
    setMappings((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  }

  const removeMapping = (index: number) => {
    setMappings((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const replaceMappings = (next: ProductMapping[]) => {
    setMappings(next)
  }

  const uploadContract = async (file: File, contractType: string, version?: string, expiresAt?: string) => {
    if (!supplierID) return
    setUploadingContract(true)
    setError(null)
    setNotice(null)
    try {
      const headers = await getAuthHeaders({ 'content-type': 'application/json' })
      const presignRes = await fetch(`/api/admin/suppliers/${supplierID}/contracts/presign`, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          file_name: file.name,
          content_type: file.type,
        }),
      })
      if (!presignRes.ok) throw new Error(`presign_failed:${presignRes.status}`)

      const presignPayload = (await presignRes.json()) as {
        data?: { upload_url: string; method: string; file_object_key: string; headers?: Record<string, string> }
      }
      const pre = presignPayload.data
      if (!pre?.upload_url || !pre?.file_object_key) {
        throw new Error('invalid_presign_response')
      }

      const uploadHeaders = new Headers()
      if (pre.headers) {
        for (const [k, v] of Object.entries(pre.headers)) {
          uploadHeaders.set(k, v)
        }
      }

      const uploadRes = await fetch(pre.upload_url, {
        method: pre.method || 'PUT',
        headers: uploadHeaders,
        body: file,
      })
      if (!uploadRes.ok) throw new Error(`upload_failed:${uploadRes.status}`)

      const createRes = await fetch(`/api/admin/suppliers/${supplierID}/contracts`, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: JSON.stringify({
          contract_type: contractType,
          version: version || undefined,
          expires_at: expiresAt || undefined,
          file_object_key: pre.file_object_key,
          file_name: file.name,
          content_type: file.type,
          size_bytes: file.size,
        }),
      })
      if (!createRes.ok) throw new Error(`contract_create_failed:${createRes.status}`)

      setNotice('Vertrag wurde hochgeladen.')
      await loadAll({ keepSelectedRun: true })
    } catch (uploadErr) {
      setError(uploadErr instanceof Error ? uploadErr.message : 'contract_upload_failed')
    } finally {
      setUploadingContract(false)
    }
  }

  const downloadContract = async (contractID: string) => {
    if (!supplierID) return
    setError(null)
    setNotice(null)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/suppliers/${supplierID}/contracts/${contractID}/download-url`, {
        cache: 'no-store',
        headers,
      })
      if (!res.ok) throw new Error(`download_url_failed:${res.status}`)
      const payload = (await res.json()) as { data?: { download_url: string } }
      const downloadURL = payload.data?.download_url
      if (!downloadURL) throw new Error('no_download_url_returned')

      window.open(downloadURL, '_blank')
    } catch (dlErr) {
      setError(dlErr instanceof Error ? dlErr.message : 'download_failed')
    }
  }

  const sendCommunicationEmail = async (to: string, subject: string, body: string, threadID?: string) => {
    if (!supplierID) return
    setSendingCommunication(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/communications`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          channel: 'email',
          direction: 'outbound',
          recipient: to,
          subject: subject || undefined,
          body,
          thread_id: threadID || undefined,
          metadata: { source: 'admin_ui' },
        }),
      })
      if (!response.ok) throw new Error(`communication_send_failed:${response.status}`)

      setNotice('E-Mail wurde in die Queue gestellt.')
      await loadAll({ keepSelectedRun: true })
    } catch (sendErr) {
      setError(sendErr instanceof Error ? sendErr.message : 'communication_send_failed')
    } finally {
      setSendingCommunication(false)
    }
  }

  const createAPIKey = async (scopes: string[], metadata?: Record<string, unknown>) => {
    if (!supplierID) return
    setCreatingKey(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/api-keys`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({
          scopes,
          metadata,
        }),
      })
      if (!response.ok) throw new Error(`api_key_create_failed:${response.status}`)

      const payload = (await response.json()) as { data?: SupplierAPIKey }
      if (payload.data) {
        setApiKeys((current) => [payload.data!, ...current])
      }
      setNotice('API-Key wurde generiert.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'api_key_create_failed')
    } finally {
      setCreatingKey(false)
    }
  }

  const revokeAPIKey = async (keyID: string) => {
    if (!supplierID) return
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/admin/suppliers/${supplierID}/api-keys/${keyID}/revoke`, {
        method: 'POST',
        cache: 'no-store',
        headers: await getAuthHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      })
      if (!response.ok) throw new Error(`api_key_revoke_failed:${response.status}`)

      setNotice('API-Key wurde widerrufen.')
      await loadAll({ keepSelectedRun: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'api_key_revoke_failed')
    }
  }

  const testWebhookInbound = async (payload: Record<string, unknown>) => {
    if (!supplierID) return { error: 'supplier_id_missing' }
    const response = await fetch(`/api/admin/suppliers/${supplierID}/webhooks/test-inbound`, {
      method: 'POST',
      cache: 'no-store',
      headers: await getAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ payload }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `inbound_test_failed:${response.status}`)
    return data.data
  }

  const testWebhookOutbound = async (payload: Record<string, unknown>) => {
    if (!supplierID) throw new Error('supplier_id_missing')
    const response = await fetch(`/api/admin/suppliers/${supplierID}/webhooks/test-outbound`, {
      method: 'POST',
      cache: 'no-store',
      headers: await getAuthHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ payload }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `outbound_test_failed:${response.status}`)
    return data.data
  }

  return {
    loading,
    error,
    supplier,
    runs,
    selectedRunID,
    runDetail,
    automationHealth,
    performance,
    credentialsProvider,
    credentialsUsername,
    credentialsSecret,
    credentialsMetadata,
    hasSecret,
    supplierStatus,
    supplierOnboardingStatus,
    supplierComplianceState,
    complianceDocumentsReceived,
    complianceTaxIDVerified,
    complianceBankDetailsVerified,
    slaAckHours,
    slaFulfillmentHours,
    paymentTermsDays,
    earlyPaymentDiscountPct,
    earlyPaymentDiscountDays,
    supplierFulfillmentMode,
    supplierAutoFulfillEnabled,
    supplierRegistrationURL,
    supplierPortalURL,
    supplierContactEmail,
    supplierAPIEndpoint,
    specializationTags,
    executionMode,
    skillID,
    dryRun,
    mappings,
    catalogProducts,
    contracts,
    communications,
    auditLog,
    apiKeys,
    creatingKey,
    savingCredentials,
    savingMappings,
    savingSupplier,
    startingRun,
    updatingRunStatus,
    importingCatalogProductID,
    syncingCatalog,
    uploadingContract,
    sendingCommunication,
    notice,
    setNotice,
    setError,
    setSelectedRunID,
    setCredentialsProvider,
    setCredentialsUsername,
    setCredentialsSecret,
    setCredentialsMetadata,
    setSupplierStatus,
    setSupplierOnboardingStatus,
    setSupplierComplianceState,
    setComplianceDocumentsReceived,
    setComplianceTaxIDVerified,
    setComplianceBankDetailsVerified,
    setSlaAckHours,
    setSlaFulfillmentHours,
    setPaymentTermsDays,
    setEarlyPaymentDiscountPct,
    setEarlyPaymentDiscountDays,
    setSupplierFulfillmentMode,
    setSupplierAutoFulfillEnabled,
    setSupplierRegistrationURL,
    setSupplierPortalURL,
    setSupplierContactEmail,
    setSupplierAPIEndpoint,
    setSpecializationTags,
    setExecutionMode,
    setSkillID,
    setDryRun,
    loadAll,
    saveCredentials,
    saveMappings,
    saveSupplierSetup,
    startRun,
    patchRunStatus,
    importCatalogProduct,
    syncCatalog,
    addMapping,
    updateMapping,
    removeMapping,
    replaceMappings,
    uploadContract,
    downloadContract,
    sendCommunicationEmail,
    createAPIKey,
    revokeAPIKey,
    testWebhookInbound,
    testWebhookOutbound,
  }
}
