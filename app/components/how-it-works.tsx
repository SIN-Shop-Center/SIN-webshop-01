'use client'

import {useTranslations} from 'next-intl'
import {Search, CreditCard, PackageCheck} from 'lucide-react'

export function HowItWorks() {
  const t = useTranslations('howItWorks')

  const STEPS = [
    {
      icon: Search,
      title: t('step1Title'),
      text: t('step1Text'),
    },
    {
      icon: CreditCard,
      title: t('step2Title'),
      text: t('step2Text'),
    },
    {
      icon: PackageCheck,
      title: t('step3Title'),
      text: t('step3Text'),
    },
  ] as const

  return (
    <section aria-label={t('label')} className="bg-accent py-16">
      <div className="mx-auto w-full max-w-7xl px-4">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-balance">
          {t('heading')}<span className="text-primary">{t('headingHighlight')}</span>
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-border bg-card p-8 text-center"
            >
              <span
                aria-hidden="true"
                className="absolute -top-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
              >
                {i + 1}
              </span>
              <step.icon className="mx-auto mb-4 size-10 text-primary" aria-hidden="true" />
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
