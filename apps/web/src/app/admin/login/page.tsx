import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { buildPageMetadata } from '@/lib/page-metadata'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin-Login',
  description: 'Admincenter-Zugang für Admin- und Ops-Konten.',
  path: '/admin/login',
  noIndex: true,
})

export default function AdminLoginPage() {
  redirect('/login?next=/admin')
}
