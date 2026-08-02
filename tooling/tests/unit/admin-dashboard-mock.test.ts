import { describe, expect, it } from 'vitest'

import { createAdminDashboardMockData } from '@/lib/admin-dashboard/mock-data'

describe('createAdminDashboardMockData', () => {
  it('creates a complete deterministic dashboard snapshot', () => {
    const now = new Date('2026-07-30T00:00:00.000Z')
    const data = createAdminDashboardMockData(now)

    expect(data.mode).toBe('mock')
    expect(data.generatedAt).toBe(now.toISOString())
    expect(data.stats.orderCount).toBeGreaterThan(0)
    expect(data.failedOrders).toHaveLength(1)
    expect(data.operations.stages).toHaveLength(7)
    expect(data.operations.recentJobs).toHaveLength(3)
    expect(data.operations.channels.map((channel) => channel.channel)).toEqual([
      'storefront',
      'cj_dropshipping',
      'tiktok_shop',
    ])
  })

  it('contains no live credentials or routable provider URLs', () => {
    const serialized = JSON.stringify(createAdminDashboardMockData())

    expect(serialized).not.toContain('supabase.co')
    expect(serialized).not.toContain('stripe.com')
    expect(serialized).not.toContain('api.cjdropshipping.com')
    expect(serialized).not.toMatch(/(sk_live_|sbp_|service_role)/)
  })
})
