import { getAdminOrders, getAdminStats } from '@/lib/actions/admin'
import { getOperationsOverview } from '@/lib/actions/operations/overview'
import { isAdminLocalPreviewEnabled } from '@/lib/admin-preview'
import { createAdminDashboardMockData } from './mock-data'
import type { AdminDashboardData } from './types'

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (isAdminLocalPreviewEnabled()) {
    return createAdminDashboardMockData(new Date())
  }

  const [stats, failedOrders, operations] = await Promise.all([
    getAdminStats(),
    getAdminOrders('failed'),
    getOperationsOverview(),
  ])

  return {
    mode: 'live',
    stats,
    failedOrders,
    operations,
    generatedAt: new Date().toISOString(),
  }
}
