import {
  Bot,
  DatabaseZap,
  Film,
  Globe2,
  PackageCheck,
  Search,
  Send,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { CommerceOperation } from '@/lib/actions/operations/types'

export type AutomationDefinition = {
  id: CommerceOperation
  title: string
  description: string
  output: string
  icon: LucideIcon
  approval: string
}

export const AUTOMATIONS: AutomationDefinition[] = [
  {
    id: 'trend.scan',
    title: 'Trend Intelligence',
    description: 'Sammelt echte Signale aus konfigurierten Scraper-Feeds, Marktplätzen und Social-Quellen. Keine halluzinierten LLM-Trends.',
    output: 'Bewertete Trend-Kandidaten mit Quelle und Evidenz',
    icon: Search,
    approval: 'Automatisch; Quellen müssen konfiguriert sein',
  },
  {
    id: 'cj.rank',
    title: 'CJ Top 10',
    description: 'Sucht passende CJ-Produkte und bewertet EU-Bestand, Lieferzeit, Marge, Varianten und Datenqualität.',
    output: 'Maximal zehn beschaffbare Tageskandidaten',
    icon: PackageCheck,
    approval: 'Policy-Gate vor dem Import',
  },
  {
    id: 'product.enrich',
    title: 'Produkt Enrichment',
    description: 'Vervollständigt Produkttitel, Beschreibungen, Fakten, SEO, Übersetzungen und Compliance-Felder aus belegbaren Quellen.',
    output: 'Vollständiger Produktdatensatz mit Qualitätsbericht',
    icon: Globe2,
    approval: 'Quellen- und Compliance-Prüfung',
  },
  {
    id: 'creative.generate',
    title: 'Creative Factory',
    description: 'Erzeugt Bild- und UGC-Aufträge und übergibt Videojobs an das lokale OpenMontage-System.',
    output: 'Produktbilder, UGC-Varianten, Videos und Thumbnails',
    icon: Film,
    approval: 'Creative-QA vor Veröffentlichung',
  },
  {
    id: 'shop.publish',
    title: 'Shop Publishing',
    description: 'Aktiviert nur freigegebene Produkte mit Bestand, Preis, Medien, Versand und rechtlichen Pflichtdaten.',
    output: 'Veröffentlichte Shop-Produkte',
    icon: DatabaseZap,
    approval: 'Harte Datenqualitäts- und Compliance-Gates',
  },
  {
    id: 'tiktok.publish',
    title: 'TikTok Shop Sync',
    description: 'Veröffentlicht Listings über die offizielle Seller-API und synchronisiert Preis, Bestand und Orders.',
    output: 'TikTok-Listings mit nachvollziehbarem Status',
    icon: Send,
    approval: 'TikTok-Review und GPSR-Pflichtfelder',
  },
  {
    id: 'social.prepare',
    title: 'Social Distribution',
    description: 'Erstellt Posts, Antworten und Outreach-Vorschläge als Freigabe-Queue. Keine unkontrollierten Massen-DMs oder Fake-Interaktionen.',
    output: 'Personalisierte, prüfbare Social-Entwürfe',
    icon: ShieldCheck,
    approval: 'Menschliche Freigabe für direkte Ansprache',
  },
]

export { Bot }
