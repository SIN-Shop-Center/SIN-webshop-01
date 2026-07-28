export type CommerceOperation =
  | 'pipeline.daily'
  | 'trend.scan'
  | 'cj.rank'
  | 'product.enrich'
  | 'creative.generate'
  | 'shop.publish'
  | 'tiktok.publish'
  | 'social.prepare'

export interface PipelineStageSnapshot {
  id: CommerceOperation
  name: string
  description: string
  status: 'ready' | 'attention' | 'blocked' | 'idle'
  count: number
  href: string
}

export interface QueueJobSnapshot {
  id: string
  jobType: string
  status: string
  attempts: number
  maxAttempts: number
  createdAt: string
  lastError: string | null
}

export interface ChannelSnapshot {
  channel: string
  status: string
  lastHealthAt: string | null
}

export interface OperationsOverview {
  stages: PipelineStageSnapshot[]
  queuedJobs: number
  failedJobs: number
  openIncidents: number
  recentJobs: QueueJobSnapshot[]
  channels: ChannelSnapshot[]
  warnings: string[]
}
