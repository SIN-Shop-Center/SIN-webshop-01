export type DomainConfig = {
  title: string
  endpoint: string
}

export type AdminRecord = Record<string, unknown>

export const DOMAIN_CONFIG: Record<string, DomainConfig> = {
  orders: { title: 'Bestellungen', endpoint: '/api/admin/orders?limit=20' },
  products: { title: 'Produkte', endpoint: '/api/admin/products?limit=20' },
  customers: { title: 'Kunden', endpoint: '/api/admin/customers?limit=20' },
  suppliers: { title: 'Lieferanten', endpoint: '/api/admin/suppliers?limit=20' },
  support: { title: 'Support Tickets', endpoint: '/api/support/tickets?limit=20' },
  trends: { title: 'Trend-Kandidaten', endpoint: '/api/admin/trends/candidates?limit=50' },
  channels: { title: 'Channel Accounts', endpoint: '/api/admin/channels' },
  'channel-health': { title: 'Channel Health (TikTok)', endpoint: '/api/admin/channels/tiktok/health' },
  kpi: { title: 'KPI Scorecard', endpoint: '/api/admin/kpi/scorecard' },
  attribution: { title: 'Attribution Summary', endpoint: '/api/admin/attribution/summary' },
  growth: { title: 'Growth Budget Policy', endpoint: '/api/admin/growth/budget-policy' },
  revenue: { title: 'Revenue Forecast (Base)', endpoint: '/api/admin/revenue/forecast?scenario=base' },
  'revenue-policy': { title: 'Revenue Forecast Policy', endpoint: '/api/admin/revenue/forecast-policy' },
  creatives: { title: 'Creative Assets', endpoint: '/api/admin/creatives?limit=50' },
  creators: { title: 'Creators', endpoint: '/api/admin/creators?limit=50' },
  'affiliate-offers': { title: 'Affiliate Offers', endpoint: '/api/admin/affiliate/offers?limit=50' },
  automation: { title: 'Automation Health', endpoint: '/api/admin/automation/health' },
  'kill-switch': { title: 'Kill Switch Configuration', endpoint: '/api/admin/settings' },
  crm: { title: 'CRM Tasks', endpoint: '/api/admin/crm/tasks?limit=50' },
  'csm-sla': { title: 'CSM SLA Tasks', endpoint: '/api/admin/crm/tasks?status=open&limit=50' },
}

export const DOMAIN_COLUMNS: Record<string, string[]> = {
  orders: ['id', 'status', 'payment_status', 'total_amount', 'currency', 'created_at'],
  products: ['id', 'name', 'sku', 'price', 'stock', 'is_active'],
  customers: ['id', 'email', 'name', 'orders_count', 'total_spent', 'created_at'],
  suppliers: ['id', 'name', 'status', 'country', 'contact_email', 'updated_at'],
  support: ['id', 'subject', 'status', 'priority', 'customer_email', 'updated_at'],
  trends: ['id', 'title', 'cluster', 'score', 'decision_state', 'lifecycle_state'],
  channels: ['id', 'channel', 'account_name', 'status', 'connection_mode', 'updated_at'],
  'channel-health': ['channel', 'status', 'healthy', 'sync_failures_24h', 'token_present', 'last_sync_status'],
  kpi: ['metric', 'current', 'target', 'unit', 'comparator', 'ok'],
  attribution: ['channel', 'attributed_orders', 'revenue_amount', 'cost_amount', 'mer'],
  growth: ['scope', 'channel', 'daily_cap', 'weekly_cap', 'monthly_cap', 'target_mer', 'target_roas', 'hard_stop'],
  revenue: ['scenario', 'currency', 'paid_clicks', 'organic_sessions', 'total_sessions', 'orders', 'gmv', 'mer', 'cac'],
  'revenue-policy': ['currency', 'conservative', 'base', 'scale', 'updated_at'],
  creatives: ['id', 'channel', 'asset_type', 'title', 'status', 'updated_at'],
  creators: ['id', 'handle', 'platform', 'status', 'region', 'score', 'updated_at'],
  'affiliate-offers': ['id', 'creator_id', 'code', 'commission_pct', 'status', 'valid_from', 'valid_to'],
  automation: [
    'ready',
    'pending_supplier_orders',
    'failed_supplier_orders',
    'critical_dlq_jobs',
    'payment_without_supplier_minute',
  ],
  'kill-switch': ['growth_kill_switch', 'automation_policy', 'trend_policy', 'autopilot_ready'],
  crm: ['id', 'entity_type', 'entity_id', 'title', 'status', 'priority', 'updated_at'],
  'csm-sla': ['id', 'entity_type', 'entity_id', 'title', 'status', 'priority', 'due_at'],
}

export function extractItems(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') {
    return []
  }
  const typed = payload as { items?: unknown[]; data?: Record<string, unknown> }
  if (Array.isArray(typed.items)) {
    return typed.items
  }
  if (typed.data && typeof typed.data === 'object') {
    for (const value of Object.values(typed.data)) {
      if (Array.isArray(value)) {
        return value
      }
    }
    return [typed.data]
  }
  const recordPayload = payload as Record<string, unknown>
  if (Array.isArray(recordPayload.items)) {
    return recordPayload.items
  }
  return [recordPayload]
}

export function toRecords(items: unknown[]): AdminRecord[] {
  return items.filter((item): item is AdminRecord => !!item && typeof item === 'object')
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein'
  }
  return JSON.stringify(value)
}
