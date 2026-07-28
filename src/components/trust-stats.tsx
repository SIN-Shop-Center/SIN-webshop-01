'use client'

import {useTranslations} from 'next-intl'
import {Star} from 'lucide-react'

export function TrustStats() {
  const t = useTranslations('trustStats')

  const STATS = [
    {value: t('productsValue'), label: t('productsLabel'), sub: t('productsSub')},
    {value: t('customersValue'), label: t('customersLabel'), sub: t('customersSub')},
    {value: t('deliveryValue'), label: t('deliveryLabel'), sub: t('deliverySub')},
  ] as const

  return (
    <section aria-label={t('label')} className="bg-accent py-12">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <p className="text-3xl font-extrabold tracking-tight text-primary">
              {s.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-card-foreground">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div
            className="flex items-center justify-center gap-0.5"
            aria-label={t('ratingLabel')}
          >
            {Array.from({length: 5}).map((_, i) => (
              <Star
                key={i}
                className="size-5 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
            ))}
          </div>
          <p className="mt-1 text-sm font-semibold text-card-foreground">
            {t('ratingText')}
          </p>
          <p className="text-xs text-muted-foreground">{t('ratingSub')}</p>
        </div>
      </div>
    </section>
  )
}
