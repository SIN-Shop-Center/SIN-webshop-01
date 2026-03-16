export type SupplierLatestRun = {
  id: string
  status: string
  execution_mode: string
  skill_id?: string
  dry_run?: boolean
  started_at?: string
  finished_at?: string
  updated_at?: string
}

export type SupplierProduct = {
  id: string
  name: string
  price?: number
  stock?: number
  is_active?: boolean
}

export type SupplierDetail = {
  id: string
  name: string
  email?: string
  contact_email?: string
  phone?: string
  website?: string
  api_endpoint?: string
  fulfillment_mode?: string
  auto_fulfill_enabled?: boolean
  sla_hours?: number
  sla_ack_hours?: number
  sla_fulfillment_hours?: number
  payment_terms_days?: number
  early_payment_discount_pct?: number
  early_payment_discount_days?: number
  has_secret?: boolean
  status?: string
  rating?: number
  notes?: string
  contact_person?: string
  country?: string
  shipping_time_days?: number
  minimum_order?: number
  onboarding_status?: string
  registration_url?: string
  portal_url?: string
  compliance_state?: string
  specialization_tags?: string[]
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
  credential_summary?: {
    provider?: string
    username?: string
    metadata?: Record<string, unknown>
    last_rotated_at?: string
    has_secret?: boolean
  }
  latest_run?: SupplierLatestRun
  products?: SupplierProduct[]
}

export type SupplierResponse = {
  success?: boolean
  data?: SupplierDetail
}

export type CredentialsResponse = {
  success?: boolean
  data?: {
    provider?: string
    username?: string
    metadata?: Record<string, unknown>
    has_secret?: boolean
    last_rotated_at?: string
  }
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ListEnvelope<T> = {
  success?: boolean
  data?: {
    items?: T[]
    pagination?: Pagination
  }
}

export type OnboardingRun = {
  id: string
  supplier_id: string
  status: string
  execution_mode: string
  skill_id?: string
  dry_run?: boolean
  started_at?: string
  finished_at?: string
  updated_at?: string
  steps_count?: number
}

export type RunStep = {
  id: string
  step_order: number
  step_type: string
  status: string
  attempt_count?: number
  artifact_urls?: string[]
  error_message?: string
  started_at?: string
  finished_at?: string
  updated_at?: string
}

export type RunActivity = {
  id: string
  activity_type: string
  severity: string
  actor_type?: string
  message: string
  metadata?: Record<string, unknown>
  created_at?: string
}

export type RunDetail = OnboardingRun & {
  request_payload?: Record<string, unknown>
  result_payload?: Record<string, unknown>
  steps?: RunStep[]
  activity?: RunActivity[]
  last_error?: string
}

export type ProductMapping = {
  product_id: string
  product_name?: string
  product_sku?: string
  priority?: number
  is_primary?: boolean
  is_active?: boolean
  supplier_sku?: string
  cost_price?: number
  cost_currency?: string
  cost_fx_rate_to_eur?: number
  lead_time_days?: number
  reorder_min_stock?: number
  reorder_target_stock?: number
}

export type SupplierCatalogProduct = {
  id: string
  supplier_id: string
  external_product_id?: string
  supplier_sku?: string
  title: string
  description?: string
  source_url?: string
  image_url?: string
  currency?: string
  price?: number
  compare_at_price?: number
  minimum_order_quantity?: number
  stock_hint?: number
  lead_time_days?: number
  status?: string
  review_note?: string
  ai_score?: number
  metadata?: Record<string, unknown>
  imported_product_id?: string
  imported_product?: {
    id: string
    name: string
    slug?: string
    is_active?: boolean
  } | null
  discovered_at?: string
  last_seen_at?: string
  created_at?: string
  updated_at?: string
}

export type SupplierContract = {
  id: string
  supplier_id: string
  contract_type: string
  version?: string
  status: string
  effective_at?: string
  expires_at?: string
  file_object_key: string
  file_name?: string
  content_type?: string
  size_bytes?: number
  metadata?: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export type SupplierCommunication = {
  id: string
  supplier_id: string
  channel: string
  direction: string
  subject?: string
  body: string
  sender?: string
  recipient?: string
  thread_id?: string
  external_id?: string
  status: string
  metadata?: Record<string, unknown>
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type SupplierAuditLogEntry = {
  id: string
  supplier_id: string
  actor_id?: string
  actor_role?: string
  request_id?: string
  action: string
  entity_type: string
  entity_id?: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  created_at?: string
}

export type AutomationHealth = {
  ready?: boolean
  pending_supplier_orders?: number
  failed_supplier_orders?: number
  critical_dlq_jobs?: number
  payment_without_supplier_minutes?: number
  policy?: {
    catalog_enabled?: boolean
    checkout_enabled?: boolean
    supplier_fulfillment_enabled?: boolean
    mailing_enabled?: boolean
    max_retry_attempts?: number
    alert_threshold_minutes?: number
  }
}

export type SupplierPerformance = {
  supplier_id: string
  window_days: number
  metrics?: {
    total?: number
    placed?: number
    failed?: number
    dispatching?: number
    pending?: number
    cancelled?: number
    on_time_rate?: number
    avg_place_latency_seconds?: number
    p95_place_latency_seconds?: number
  }
}

export type SupplierPerformanceResponse = {
  success?: boolean
  data?: SupplierPerformance
}

export function prettyJSON(input: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return fallback
  }
}

export type SupplierAPIKey = {
  id: string
  supplier_id: string
  key_prefix: string
  scopes: string[]
  metadata?: Record<string, unknown>
  created_at?: string
  last_used_at?: string
  revoked_at?: string
  revoked_by?: string
  api_key?: string
}

export type WebhookTestOutboundResult = {
  status: number
  body: string
  response_time: string
  error?: string
}
