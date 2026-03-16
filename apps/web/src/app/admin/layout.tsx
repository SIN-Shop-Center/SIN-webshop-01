import type { Metadata } from 'next'
import { AdminAccessGate } from '@/features/admin'
import { AdminShell } from '@/features/admin/AdminShell'

export const metadata: Metadata = {
  title: {
    default: 'Admin',
    template: '%s | Simone Shop Admin',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminAccessGate>
      <AdminShell>{children}</AdminShell>
    </AdminAccessGate>
  )
}
