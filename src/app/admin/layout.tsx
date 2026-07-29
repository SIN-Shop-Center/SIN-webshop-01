import { requireAdmin } from '@/lib/admin-guard'
import { AdminShellNav } from './components/AdminShellNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminShellNav />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
