'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient, createPublicAdminClient } from '@/lib/supabase/admin'
import { asCreativeCheckpoints, asRecord, requiredText } from './shared'

const CREATIVE_STAGES = new Set([
  'research',
  'proposal',
  'script',
  'scene_plan',
  'assets',
  'edit',
  'compose',
  'publish',
])

export async function decideCreativeCheckpoint(formData: FormData): Promise<void> {
  const user = await requireAdmin()
  const control = createPublicAdminClient()
  const jobId = requiredText(formData, 'jobId')
  const stage = requiredText(formData, 'stage')
  const decision = requiredText(formData, 'decision')
  const feedback = String(formData.get('feedback') || '').trim()

  if (!CREATIVE_STAGES.has(stage)) throw new Error('Ungültige Creative-Stufe')
  if (!['approved', 'revision_requested'].includes(decision)) {
    throw new Error('Ungültige Creative-Entscheidung')
  }
  if (decision === 'revision_requested' && feedback.length < 5) {
    throw new Error('Für eine Überarbeitung ist konkretes Feedback erforderlich.')
  }

  const { data: job, error: jobError } = await control
    .from('commerce_creative_jobs')
    .select('id, project_id, status, output_payload')
    .eq('id', jobId)
    .maybeSingle()
  if (jobError) throw jobError
  if (!job) throw new Error('Creative-Job nicht gefunden')

  const outputPayload = asRecord(job.output_payload) ?? {}
  const checkpoints = asCreativeCheckpoints(asRecord(outputPayload.checkpoint_summary)?.checkpoints)
  const checkpoint = checkpoints.find((item) => item.stage === stage)
  if (!checkpoint) throw new Error(`Checkpoint ${stage} wurde noch nicht synchronisiert.`)
  if (checkpoint.status !== 'awaiting_human' || checkpoint.humanApproved) {
    throw new Error(`Checkpoint ${stage} wartet nicht auf eine Entscheidung.`)
  }

  const now = new Date().toISOString()
  const { error: approvalError } = await control
    .from('commerce_creative_approvals')
    .upsert({
      creative_job_id: jobId,
      stage,
      decision,
      feedback: feedback || null,
      status: 'pending',
      decided_by: user.id,
      decided_at: now,
      applied_at: null,
      last_error: null,
    }, { onConflict: 'creative_job_id,stage' })
  if (approvalError) throw approvalError

  const { error: queueError } = await control
    .from('queue_jobs')
    .insert({
      queue_name: 'commerce-autopilot',
      job_type: 'creative.generate',
      dedupe_key: `creative.resume:${jobId}:${stage}:${crypto.randomUUID()}`,
      payload: {
        requested_at: now,
        requested_from: 'creative-approval-control-plane',
        creative_job_id: jobId,
        project_id: job.project_id,
        checkpoint_stage: stage,
        decision,
      },
      status: 'pending',
      max_attempts: 3,
      available_at: now,
    })
  if (queueError) throw queueError

  const { error: updateError } = await control
    .from('commerce_creative_jobs')
    .update({
      status: 'awaiting_approval',
      output_payload: {
        ...outputPayload,
        control_plane_request: {
          stage,
          decision,
          feedback: feedback || null,
          requested_at: now,
        },
      },
      last_error: null,
    })
    .eq('id', jobId)
  if (updateError) throw updateError

  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/creative')
  revalidatePath('/admin/automatisierungen')
}

export async function approveCreativeJob(jobId: string): Promise<void> {
  await requireAdmin()
  const control = createPublicAdminClient()
  const shop = createAdminClient()
  const { data: job, error: jobError } = await control
    .from('commerce_creative_jobs')
    .select('id, product_id, status, render_path, output_payload')
    .eq('id', jobId)
    .maybeSingle()
  if (jobError) throw jobError
  if (!job) throw new Error('Creative-Job nicht gefunden')
  if (asRecord(asRecord(job.output_payload)?.final_review)?.status !== 'pass' || !job.render_path) {
    throw new Error('OpenMontage final_review muss bestanden sein und der Render muss existieren.')
  }

  const now = new Date().toISOString()
  const { error: creativeError } = await control
    .from('commerce_creative_jobs')
    .update({
      status: 'approved',
      approval_state: 'assets_approved',
      completed_at: now,
      last_error: null,
    })
    .eq('id', jobId)
  if (creativeError) throw creativeError

  const { error: productError } = await shop
    .from('products')
    .update({ creative_status: 'approved', pipeline_state: 'ready_to_publish', updated_at: now })
    .eq('id', job.product_id)
  if (productError) throw productError

  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/creative')
}

export async function rejectCreativeJob(jobId: string) {
  await requireAdmin()
  const control = createPublicAdminClient()
  const shop = createAdminClient()
  const { data: job } = await control
    .from('commerce_creative_jobs')
    .select('product_id')
    .eq('id', jobId)
    .maybeSingle()
  await control
    .from('commerce_creative_jobs')
    .update({ status: 'failed', approval_state: 'rejected', last_error: 'Vom Admin abgelehnt' })
    .eq('id', jobId)
  if (job?.product_id) {
    await shop.from('products').update({ creative_status: 'failed' }).eq('id', job.product_id)
  }
  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/creative')
}
