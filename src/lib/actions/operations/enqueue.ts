'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { createPublicAdminClient } from '@/lib/supabase/admin'
import type { CommerceOperation } from './types'

const ALLOWED_OPERATIONS = new Set<CommerceOperation>([
  'pipeline.daily',
  'trend.scan',
  'cj.rank',
  'product.enrich',
  'creative.generate',
  'shop.publish',
  'tiktok.publish',
  'social.prepare',
])

export async function enqueueCommerceOperation(
  operation: CommerceOperation,
): Promise<{ ok: boolean; message: string }> {
  await requireAdmin()

  if (!ALLOWED_OPERATIONS.has(operation)) {
    return { ok: false, message: 'Unbekannte Operation.' }
  }

  const control = createPublicAdminClient()
  const now = new Date().toISOString()
  const { error } = await control.from('queue_jobs').insert({
    queue_name: 'commerce-autopilot',
    job_type: operation,
    dedupe_key: `${operation}:${crypto.randomUUID()}`,
    payload: {
      requested_at: now,
      requested_from: 'admin-control-plane',
      approval_mode: operation === 'social.prepare' ? 'human_review_required' : 'policy_gated',
    },
    status: 'pending',
    max_attempts: 3,
    available_at: now,
  })

  if (error) return { ok: false, message: error.message }

  revalidatePath('/admin')
  revalidatePath('/admin/automatisierungen')
  revalidatePath('/admin/creative')
  return { ok: true, message: 'Auftrag wurde in die lokale Pipeline gestellt.' }
}
