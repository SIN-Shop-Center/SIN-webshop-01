import type { AdminOrder } from '@/lib/actions/admin'
import type { OperationsOverview } from '@/lib/actions/operations/types'

export interface AdminDashboardStats {
  orderCount: number
  revenueCents: number
  failedCount: number
  forwardedCount: number
  shippedCount: number
}

export interface AdminDashboardData {
  mode: 'live' | 'mock'
  stats: AdminDashboardStats
  failedOrders: AdminOrder[]
  operations: OperationsOverview
  generatedAt: string
}
