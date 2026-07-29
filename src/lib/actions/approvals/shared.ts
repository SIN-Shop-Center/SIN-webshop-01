import type { ApprovalCreativeCheckpoint } from './types'

export function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

export function asVariants(value: unknown): Array<{ stock?: number }> {
  return Array.isArray(value) ? value as Array<{ stock?: number }> : []
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function asCreativeCheckpoints(value: unknown): ApprovalCreativeCheckpoint[] {
  if (!Array.isArray(value)) return []
  return value
    .map((checkpoint) => asRecord(checkpoint))
    .filter((checkpoint): checkpoint is Record<string, unknown> => checkpoint !== null)
    .map((checkpoint) => {
      const finalReview = asRecord(checkpoint.final_review)
      return {
        stage: String(checkpoint.stage || ''),
        status: String(checkpoint.status || 'unknown'),
        timestamp: checkpoint.timestamp ? String(checkpoint.timestamp) : null,
        humanApprovalRequired: Boolean(checkpoint.human_approval_required),
        humanApproved: Boolean(checkpoint.human_approved),
        artifactNames: asStrings(checkpoint.artifact_names),
        artifactPreview: asRecord(checkpoint.artifact_preview),
        review: checkpoint.review ?? null,
        costSnapshot: checkpoint.cost_snapshot ?? null,
        finalReview: finalReview
          ? {
              status: finalReview.status ? String(finalReview.status) : null,
              summary: finalReview.summary ? String(finalReview.summary) : null,
              blockers: asStrings(finalReview.blockers),
              outputPath: finalReview.output_path ? String(finalReview.output_path) : null,
            }
          : null,
        controlPlaneDecision: checkpoint.control_plane_decision
          ? String(checkpoint.control_plane_decision)
          : null,
        controlPlaneFeedback: checkpoint.control_plane_feedback
          ? String(checkpoint.control_plane_feedback)
          : null,
      }
    })
    .filter((checkpoint) => checkpoint.stage.length > 0)
}

export function requiredText(formData: FormData, name: string): string {
  const value = String(formData.get(name) || '').trim()
  if (!value) throw new Error(`${name} fehlt`)
  return value
}

export function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function requiredHttpsUrl(formData: FormData, name: string): string {
  const value = requiredText(formData, name)
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') throw new Error('HTTPS erforderlich')
    return url.toString()
  } catch {
    throw new Error(`${name} muss eine gültige HTTPS-URL sein`)
  }
}
