import type { ReactNode } from 'react'
import { Clock3, LifeBuoy, Mail } from 'lucide-react'
import Link from '@/components/ui/Link'
import { PUBLIC_CONTACT_PHONE, PUBLIC_SUPPORT_EMAIL } from '@/lib/public-contact'
import { cn } from '@/lib/utils'
import { INFO_PAGE_TONE_STYLES, type InfoPageTone } from './info-page-tones'

function isExternalHref(href: string): boolean {
  return href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://')
}

type InfoSection = {
  title: string
  body: ReactNode
}

type InfoHighlight = {
  label: string
  value: string
}

type InfoPageProps = {
  title: string
  intro: string
  sections: InfoSection[]
  highlights?: InfoHighlight[]
  heroIcon?: ReactNode
  tone?: InfoPageTone
  eyebrow?: string
  sidebarEyebrow?: string
  sidebarTitle?: string
  sidebarIntro?: string
  sidebarFootnote?: string
  primaryCta?: {
    label: string
    href: string
  }
  secondaryCta?: {
    label: string
    href: string
  }
}

export function InfoPage({
  title,
  intro,
  sections,
  highlights,
  heroIcon,
  tone = 'neutral',
  eyebrow = 'Service & Rechtliches',
  sidebarEyebrow = 'Direkte Hilfe',
  sidebarTitle = 'Antworten ohne Umweg',
  sidebarIntro,
  sidebarFootnote = 'Klare Hilfe zu Bestellung, Versand, Rückgabe und Rechnung.',
  primaryCta = { label: 'Kontakt aufnehmen', href: '/kontakt' },
  secondaryCta = { label: 'FAQ ansehen', href: '/faq' },
}: InfoPageProps) {
  const activeTone = INFO_PAGE_TONE_STYLES[tone]

  return (
    <main className="shell-container py-12">
      <header
        className={cn(
          'mb-8 max-w-4xl rounded-[1.8rem] border border-brand-border p-6 shadow-[0_18px_44px_rgba(18,18,18,0.06)] md:p-8',
          activeTone.header,
        )}
      >
        <div className="flex flex-wrap items-start gap-4">
          {heroIcon ? (
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 text-brand-text shadow-[0_8px_20px_rgba(15,15,15,0.08)]',
                activeTone.icon,
              )}
            >
              {heroIcon}
            </div>
          ) : null}
          <div>
            <p className="section-eyebrow">{eyebrow}</p>
            <h1 className="text-4xl md:text-5xl">{title}</h1>
            <p className="mt-3 text-base leading-7 text-brand-text-muted">{intro}</p>
          </div>
        </div>
        {highlights && highlights.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className={cn(
                  'rounded-2xl border border-white/60 px-4 py-3 shadow-[0_10px_20px_rgba(15,15,15,0.06)]',
                  activeTone.highlight,
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-text-muted">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{item.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,18,18,0.04)]">
              <h2 className="text-2xl">{section.title}</h2>
              <div className="mt-2 text-sm leading-7 text-brand-text-muted">{section.body}</div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[1.5rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(18,18,18,0.04)]">
            <p className="section-eyebrow">{sidebarEyebrow}</p>
            <h2 className="mt-2 text-2xl">{sidebarTitle}</h2>
            {sidebarIntro ? <p className="mt-2 text-sm text-brand-text-muted">{sidebarIntro}</p> : null}
            <div className="mt-4 space-y-3 text-sm text-brand-text-muted">
              <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-bg px-4 py-3">
                <Mail className="mt-0.5 h-4 w-4 text-brand-text" />
                <div>
                  <p className="font-semibold text-brand-text">Kontakt</p>
                  <p>{PUBLIC_SUPPORT_EMAIL}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-bg px-4 py-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-brand-text" />
                <div>
                  <p className="font-semibold text-brand-text">Antwortzeit</p>
                  <p>In der Regel innerhalb von 24 Stunden</p>
                </div>
              </div>
              {PUBLIC_CONTACT_PHONE ? (
                <div className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-brand-text-muted">
                  <p className="font-semibold text-brand-text">Telefon</p>
                  <p>{PUBLIC_CONTACT_PHONE}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              {isExternalHref(primaryCta.href) ? (
                <a href={primaryCta.href} className="ui-pill ui-pill-active text-sm">
                  {primaryCta.label}
                </a>
              ) : (
                <Link href={primaryCta.href} prefetch={false} className="ui-pill ui-pill-active text-sm">
                  {primaryCta.label}
                </Link>
              )}
              {isExternalHref(secondaryCta.href) ? (
                <a href={secondaryCta.href} className="ui-pill ui-pill-muted text-sm">
                  {secondaryCta.label}
                </a>
              ) : (
                <Link href={secondaryCta.href} prefetch={false} className="ui-pill ui-pill-muted text-sm">
                  {secondaryCta.label}
                </Link>
              )}
            </div>

            <p className="mt-4 inline-flex items-center gap-2 text-xs text-brand-text-muted">
              <LifeBuoy className="h-4 w-4 text-brand-text" />
              {sidebarFootnote}
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
