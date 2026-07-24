// Purpose: Admin Audit-Log-Viewer (Issue #50 Admin-UI)
// Docs: 90 Tage Retention, JSONB before/after für Diff.

import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam ?? '1'))
  const PAGE_SIZE = 50

  const admin = createAdminClient()
  const { data: entries } = await admin
    .from('admin_audit_log')
    .select('id, action, resource_type, resource_id, created_at, admin_user_id')
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Audit-Log</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Zeit</th>
            <th className="py-2 pr-4 font-medium">Aktion</th>
            <th className="py-2 pr-4 font-medium">Ressource</th>
            <th className="py-2 font-medium">Admin</th>
          </tr>
        </thead>
        <tbody>
          {(entries ?? []).map((e) => (
            <tr key={e.id} className="border-b border-border/50">
              <td className="py-2 pr-4 whitespace-nowrap">
                {new Date(e.created_at).toLocaleString('de-DE')}
              </td>
              <td className="py-2 pr-4">{e.action}</td>
              <td className="py-2 pr-4">
                {e.resource_type} · {e.resource_id?.slice(0, 8)}
              </td>
              <td className="py-2">
                {e.admin_user_id?.slice(0, 8) ?? 'System'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
