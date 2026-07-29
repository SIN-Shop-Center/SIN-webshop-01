'use server'

import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient, createPublicAdminClient } from '@/lib/supabase/admin'
import { asCreativeCheckpoints, asRecord, asStrings, asVariants } from './shared'
import type { ApprovalCreativeJob, ApprovalEngagementDraft, ApprovalProduct } from './types'

export async function getApprovalQueue(): Promise<{
  products: ApprovalProduct[]
  creativeJobs: ApprovalCreativeJob[]
  engagementDrafts: ApprovalEngagementDraft[]
}> {
  await requireAdmin()
  const shop = createAdminClient()
  const control = createPublicAdminClient()

  const [{ data: productRows, error: productError }, { data: creativeRows, error: creativeError }, { data: draftRows, error: draftError }] =
    await Promise.all([
      shop
        .from('products')
        .select('id, name, title_de, description, description_de, price, stock, images, image_gallery, variants, pipeline_state, approval_state, creative_status, data_quality_score, risk_level, publish_blockers, research_source_urls, manufacturer_name, manufacturer_address, manufacturer_email, manufacturer_phone, manufacturer_verified, responsible_person_name, responsible_person_company, responsible_person_address, responsible_person_email, responsible_person_phone, responsible_person_verified, gpsr_verified_at')
        .in('approval_state', ['review_required', 'approved'])
        .in('pipeline_state', ['enriched', 'creative_queued', 'creative_ready', 'ready_to_publish', 'paused'])
        .order('updated_at', { ascending: false })
        .limit(50),
      control
        .from('commerce_creative_jobs')
        .select('id, product_id, project_id, project_path, status, approval_state, render_path, thumbnail_path, output_payload, updated_at')
        .in('status', ['brief_ready', 'awaiting_approval', 'qa_review'])
        .order('updated_at', { ascending: false })
        .limit(50),
      control
        .from('engagement_drafts')
        .select('id, product_id, channel, interaction_type, audience_ref, source_url, message, status, created_at')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  if (productError) throw productError
  if (creativeError) throw creativeError
  if (draftError) throw draftError

  return {
    products: (productRows || []).map((data) => ({
      id: data.id,
      name: data.name,
      titleDe: data.title_de,
      description: data.description,
      descriptionDe: data.description_de,
      price: Number(data.price || 0),
      stock: Number(data.stock || 0),
      images: asStrings(data.images),
      imageGallery: asStrings(data.image_gallery),
      variants: asVariants(data.variants),
      pipelineState: data.pipeline_state ?? 'legacy',
      approvalState: data.approval_state ?? 'review_required',
      creativeStatus: data.creative_status ?? 'missing',
      dataQualityScore: Number(data.data_quality_score || 0),
      riskLevel: data.risk_level ?? 'unknown',
      publishBlockers: asStrings(data.publish_blockers),
      researchSourceUrls: asStrings(data.research_source_urls),
      manufacturerName: data.manufacturer_name,
      manufacturerAddress: data.manufacturer_address,
      manufacturerEmail: data.manufacturer_email,
      manufacturerPhone: data.manufacturer_phone,
      manufacturerVerified: Boolean(data.manufacturer_verified),
      responsiblePersonName: data.responsible_person_name,
      responsiblePersonCompany: data.responsible_person_company,
      responsiblePersonAddress: data.responsible_person_address,
      responsiblePersonEmail: data.responsible_person_email,
      responsiblePersonPhone: data.responsible_person_phone,
      responsiblePersonVerified: Boolean(data.responsible_person_verified),
      gpsrVerifiedAt: data.gpsr_verified_at,
    })),
    creativeJobs: (creativeRows || []).map((job) => {
      const output = asRecord(job.output_payload)
      const summary = asRecord(output?.checkpoint_summary)
      const finalReview = asRecord(output?.final_review)
      const checkpoints = asCreativeCheckpoints(
        summary?.checkpoints,
      )
      const openStage = asRecord(summary?.open_gate)?.stage
      return {
        id: job.id,
        productId: job.product_id,
        projectId: job.project_id,
        projectPath: job.project_path,
        status: job.status,
        approvalState: job.approval_state,
        renderPath: job.render_path,
        thumbnailPath: job.thumbnail_path,
        finalReviewStatus:
          (finalReview?.status ? String(finalReview.status) : null) ||
          checkpoints.find((checkpoint) => checkpoint.stage === 'compose')?.finalReview?.status ||
          null,
        checkpoints,
        openCheckpoint:
          checkpoints.find((checkpoint) => checkpoint.stage === openStage) ||
          checkpoints.find((checkpoint) => (
            checkpoint.status === 'awaiting_human' && !checkpoint.humanApproved
          )) ||
          null,
        updatedAt: job.updated_at,
      }
    }),
    engagementDrafts: (draftRows || []).map((draft) => ({
      id: draft.id,
      productId: draft.product_id,
      channel: draft.channel,
      interactionType: draft.interaction_type,
      audienceRef: draft.audience_ref,
      sourceUrl: draft.source_url,
      message: draft.message,
      status: draft.status,
      createdAt: draft.created_at,
    })),
  }
}
