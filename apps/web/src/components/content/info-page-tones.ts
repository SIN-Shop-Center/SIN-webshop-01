export type InfoPageTone = 'neutral' | 'warm' | 'cool' | 'accent'

export type InfoPageToneStyle = {
  header: string
  icon: string
  highlight: string
}

export const INFO_PAGE_TONE_STYLES: Record<InfoPageTone, InfoPageToneStyle> = {
  neutral: {
    header: 'bg-brand-surface',
    icon: 'bg-white/80',
    highlight: 'bg-white/80',
  },
  warm: {
    header: 'bg-gradient-to-br from-orange-50 via-white to-rose-50',
    icon: 'bg-orange-100/70',
    highlight: 'bg-white/85',
  },
  cool: {
    header: 'bg-gradient-to-br from-sky-50 via-white to-indigo-50',
    icon: 'bg-sky-100/70',
    highlight: 'bg-white/85',
  },
  accent: {
    header: 'bg-gradient-to-br from-emerald-50 via-white to-cyan-50',
    icon: 'bg-emerald-100/70',
    highlight: 'bg-white/85',
  },
}

