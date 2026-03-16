export type SupplierRow = {
  id: string
  name: string
  email?: string
  contact_email?: string
  country?: string
  website?: string
  registration_url?: string
  portal_url?: string
  api_endpoint?: string
  fulfillment_mode?: string
  auto_fulfill_enabled?: boolean
  status?: string
  onboarding_status?: string
  compliance_state?: string
  products_count?: number
  has_secret?: boolean
  updated_at?: string
}

export type SupplierListResponse = {
  success?: boolean
  data?: {
    suppliers?: SupplierRow[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}
