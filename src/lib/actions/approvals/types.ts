export interface ApprovalProduct {
  id: string
  name: string
  titleDe: string | null
  description: string | null
  descriptionDe: string | null
  price: number
  stock: number
  images: string[]
  imageGallery: string[]
  variants: Array<{ stock?: number }>
  pipelineState: string
  approvalState: string
  creativeStatus: string
  dataQualityScore: number
  riskLevel: string
  publishBlockers: string[]
  researchSourceUrls: string[]
  manufacturerName: string | null
  manufacturerAddress: string | null
  manufacturerEmail: string | null
  manufacturerPhone: string | null
  manufacturerVerified: boolean
  responsiblePersonName: string | null
  responsiblePersonCompany: string | null
  responsiblePersonAddress: string | null
  responsiblePersonEmail: string | null
  responsiblePersonPhone: string | null
  responsiblePersonVerified: boolean
  gpsrVerifiedAt: string | null
}

export interface ApprovalCreativeCheckpoint {
  stage: string
  status: string
  timestamp: string | null
  humanApprovalRequired: boolean
  humanApproved: boolean
  artifactNames: string[]
  artifactPreview: Record<string, unknown> | null
  review: unknown
  costSnapshot: unknown
  finalReview: {
    status: string | null
    summary: string | null
    blockers: string[]
    outputPath: string | null
  } | null
  controlPlaneDecision: string | null
  controlPlaneFeedback: string | null
}

export interface ApprovalCreativeJob {
  id: string
  productId: string
  projectId: string
  projectPath: string
  status: string
  approvalState: string
  renderPath: string | null
  thumbnailPath: string | null
  finalReviewStatus: string | null
  checkpoints: ApprovalCreativeCheckpoint[]
  openCheckpoint: ApprovalCreativeCheckpoint | null
  updatedAt: string
}

export interface ApprovalEngagementDraft {
  id: string
  productId: string | null
  channel: string
  interactionType: string
  audienceRef: string | null
  sourceUrl: string | null
  message: string
  status: string
  createdAt: string
}
