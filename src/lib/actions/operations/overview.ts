'use server'

import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient, createPublicAdminClient } from '@/lib/supabase/admin'
import { buildPipelineStages } from './stages'
import type { OperationsOverview } from './types'

type CountQuery = {
  count: number | null
  error: { message: string } | null
}

async function resolveCount(
  query: PromiseLike<CountQuery>,
  warningLabel: string,
  warnings: string[],
): Promise<number> {
  const result = await query
  if (result.error) {
    warnings.push(`${warningLabel}: ${result.error.message}`)
    return 0
  }
  return result.count ?? 0
}

export async function getOperationsOverview(): Promise<OperationsOverview> {
  await requireAdmin()

  const shop = createAdminClient()
  const control = createPublicAdminClient()
  const warnings: string[] = []

  const [
    trendCandidates,
    supplierCandidates,
    enrichmentJobs,
    creativeJobs,
    activeProducts,
    tiktokPending,
    socialDrafts,
    queuedJobs,
    failedJobs,
    openIncidents,
  ] = await Promise.all([
    resolveCount(
      control
        .from('trend_candidates')
        .select('id', { count: 'exact', head: true })
        .in('decision_state', ['allow', 'review_required']),
      'Trend-Kandidaten nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('supplier_catalog_products')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'reviewing', 'approved']),
      'Lieferanten-Kandidaten nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('queue_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('queue_name', 'commerce-autopilot')
        .eq('job_type', 'product.enrich')
        .in('status', ['pending', 'processing']),
      'Enrichment-Queue nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('commerce_creative_jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['queued', 'brief_ready', 'awaiting_approval', 'generating', 'qa_review']),
      'Creative-Queue nicht lesbar',
      warnings,
    ),
    resolveCount(
      shop
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      'Aktive Produkte nicht lesbar',
      warnings,
    ),
    resolveCount(
      shop
        .from('products')
        .select('id', { count: 'exact', head: true })
        .in('tiktok_status', ['pending', 'publishing', 'failed']),
      'TikTok-Status nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('engagement_drafts')
        .select('id', { count: 'exact', head: true })
        .in('status', ['draft', 'approved', 'scheduled']),
      'Social-Entwürfe nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('queue_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('queue_name', 'commerce-autopilot')
        .in('status', ['pending', 'processing']),
      'Pipeline-Queue nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('queue_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('queue_name', 'commerce-autopilot')
        .in('status', ['failed', 'dead']),
      'Fehlgeschlagene Jobs nicht lesbar',
      warnings,
    ),
    resolveCount(
      control
        .from('budget_incidents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      'Incidents nicht lesbar',
      warnings,
    ),
  ])

  const [{ data: recentJobs, error: recentError }, { data: channels, error: channelError }] =
    await Promise.all([
      control
        .from('queue_jobs')
        .select('id, job_type, status, attempt_count, max_attempts, created_at, last_error')
        .eq('queue_name', 'commerce-autopilot')
        .order('created_at', { ascending: false })
        .limit(8),
      control
        .from('channel_accounts')
        .select('channel, status, last_health_at')
        .order('channel', { ascending: true }),
    ])

  if (recentError) warnings.push(`Job-Historie: ${recentError.message}`)
  if (channelError) warnings.push(`Channel-Status: ${channelError.message}`)

  const stages = buildPipelineStages({
    trendCandidates,
    supplierCandidates,
    enrichmentJobs,
    creativeJobs,
    activeProducts,
    tiktokPending,
    socialDrafts,
  })

  return {
    stages,
    queuedJobs,
    failedJobs,
    openIncidents,
    recentJobs: (recentJobs ?? []).map((job) => ({
      id: job.id,
      jobType: job.job_type,
      status: job.status,
      attempts: job.attempt_count,
      maxAttempts: job.max_attempts,
      createdAt: job.created_at,
      lastError: job.last_error,
    })),
    channels: (channels ?? []).map((channel) => ({
      channel: channel.channel,
      status: channel.status,
      lastHealthAt: channel.last_health_at,
    })),
    warnings,
  }
}
