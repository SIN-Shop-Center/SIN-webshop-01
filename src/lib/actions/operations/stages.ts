import type { PipelineStageSnapshot } from './types'

export interface OperationStageCounts {
  trendCandidates: number
  supplierCandidates: number
  enrichmentJobs: number
  creativeJobs: number
  activeProducts: number
  tiktokPending: number
  socialDrafts: number
}

export function buildPipelineStages({
  trendCandidates,
  supplierCandidates,
  enrichmentJobs,
  creativeJobs,
  activeProducts,
  tiktokPending,
  socialDrafts,
}: OperationStageCounts): PipelineStageSnapshot[] {
  return [
      {
        id: 'trend.scan',
        name: 'Trend Intelligence',
        description: 'Reale Signale aus konfigurierten Feeds, Scraper-Runs und Marktplätzen.',
        status: trendCandidates > 0 ? 'ready' : 'attention',
        count: trendCandidates,
        href: '/admin/automatisierungen',
      },
      {
        id: 'cj.rank',
        name: 'CJ Top 10',
        description: 'EU-Bestand, Marge, Datenqualität und Lieferfähigkeit bewerten.',
        status: supplierCandidates > 0 ? 'ready' : 'idle',
        count: supplierCandidates,
        href: '/admin/produkte',
      },
      {
        id: 'product.enrich',
        name: 'Produkt Enrichment',
        description: 'Titel, Fakten, Varianten, SEO, Übersetzung und Compliance vervollständigen.',
        status: enrichmentJobs > 0 ? 'attention' : 'idle',
        count: enrichmentJobs,
        href: '/admin/automatisierungen',
      },
      {
        id: 'creative.generate',
        name: 'Creative Studio',
        description: 'Produktbilder, UGC-Pakete und OpenMontage-Videoaufträge erzeugen.',
        status: creativeJobs > 0 ? 'attention' : 'idle',
        count: creativeJobs,
        href: '/admin/creative',
      },
      {
        id: 'shop.publish',
        name: 'Shop Publishing',
        description: 'Nur freigegebene und vollständige Produkte im Shop aktivieren.',
        status: activeProducts > 0 ? 'ready' : 'attention',
        count: activeProducts,
        href: '/admin/produkte',
      },
      {
        id: 'tiktok.publish',
        name: 'TikTok Shop',
        description: 'Listings, Preis, Bestand und Bestellungen über die offizielle Shop-API.',
        status: tiktokPending > 0 ? 'attention' : 'idle',
        count: tiktokPending,
        href: '/admin/tiktok',
      },
      {
        id: 'social.prepare',
        name: 'Social Distribution',
        description: 'Posts und Outreach als prüfbare Entwürfe statt unkontrolliertem Spam.',
        status: socialDrafts > 0 ? 'attention' : 'idle',
        count: socialDrafts,
        href: '/admin/creative',
      },
    ]
}
