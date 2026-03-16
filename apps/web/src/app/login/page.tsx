import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginPageClient } from './LoginPageClient'
import { buildPageMetadata } from '@/lib/page-metadata'

type LoginPageProps = {
  searchParams?: {
    next?: string
  }
}

export function generateMetadata({ searchParams }: LoginPageProps): Metadata {
  const next = searchParams?.next || ''
  const adminLogin = next.startsWith('/admin')
  return buildPageMetadata({
    title: adminLogin ? 'Admin-Login' : 'Kunden-Login',
    description: adminLogin
      ? 'Anmeldung für Admin- und Ops-Konten mit getrenntem Zugriff auf das Admincenter.'
      : 'Anmeldung für Kundencenter, Bestellungen, Profil und Adressen an einem Ort.',
    path: '/login',
    noIndex: true,
  })
}

function LoginPageFallback() {
  return (
    <main className="shell-container py-16">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-brand-border bg-white p-8 shadow-sm">
        <div className="h-[28rem] animate-pulse rounded-2xl bg-brand-surface" />
      </section>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  )
}
