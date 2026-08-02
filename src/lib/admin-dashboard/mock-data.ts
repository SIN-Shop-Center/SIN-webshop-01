import { buildPipelineStages } from '@/lib/actions/operations/stages'
import type { AdminDashboardData } from './types'

export function createAdminDashboardMockData(
  now = new Date('2026-07-30T00:00:00.000Z'),
): AdminDashboardData {
  const iso = now.toISOString()
  const minutesAgo = (minutes: number) =>
    new Date(now.getTime() - minutes * 60_000).toISOString()

  return {
    mode: 'mock',
    generatedAt: iso,
    stats: {
      orderCount: 128,
      revenueCents: 483_920,
      failedCount: 1,
      forwardedCount: 21,
      shippedCount: 92,
    },
    failedOrders: [
      {
        id: '00000000-0000-4000-8000-000000000601',
        email: 'preview@shopsin.local',
        amount_total: 7_990,
        currency: 'eur',
        status: 'paid',
        fulfillment_status: 'failed',
        cj_order_id: null,
        cj_order_status: null,
        tracking_number: null,
        items: [
          {
            title: 'Ergonomische Schreibtischleuchte',
            quantity: 1,
            unit_amount: 7_990,
            product_id: '00000000-0000-4000-8000-000000000102',
          },
        ],
        shipping_address: {
          name: 'Local Preview',
          address: {
            country: 'DE',
            city: 'Berlin',
            line1: 'Previewstraße 1',
            postal_code: '10115',
          },
        },
        created_at: minutesAgo(42),
      },
    ],
    operations: {
      stages: buildPipelineStages({
        trendCandidates: 14,
        supplierCandidates: 10,
        enrichmentJobs: 4,
        creativeJobs: 3,
        activeProducts: 28,
        tiktokPending: 2,
        socialDrafts: 5,
      }),
      queuedJobs: 7,
      failedJobs: 1,
      openIncidents: 0,
      recentJobs: [
        {
          id: 'preview-job-1',
          jobType: 'product.enrich',
          status: 'processing',
          attempts: 1,
          maxAttempts: 3,
          createdAt: minutesAgo(4),
          lastError: null,
        },
        {
          id: 'preview-job-2',
          jobType: 'creative.generate',
          status: 'completed',
          attempts: 1,
          maxAttempts: 3,
          createdAt: minutesAgo(19),
          lastError: null,
        },
        {
          id: 'preview-job-3',
          jobType: 'cj.rank',
          status: 'failed',
          attempts: 3,
          maxAttempts: 3,
          createdAt: minutesAgo(38),
          lastError: 'Preview: Lieferantenantwort wurde absichtlich simuliert.',
        },
      ],
      channels: [
        { channel: 'storefront', status: 'connected', lastHealthAt: minutesAgo(2) },
        { channel: 'cj_dropshipping', status: 'preview', lastHealthAt: minutesAgo(12) },
        { channel: 'tiktok_shop', status: 'not_configured', lastHealthAt: null },
      ],
      warnings: [
        'Local Preview: Schreibaktionen und externe Anbieteraufrufe sind deaktiviert.',
      ],
    },
  }
}
