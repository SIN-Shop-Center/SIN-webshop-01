// Purpose: Admin-Liste aller Rücksendeanfragen (Issue #45 Admin-UI)
// Docs: Admin-Layout prüft Login + is_admin() (zweite Verteidigungslinie),
// diese Page braucht KEINEN zusätzlichen Check.

import { createAdminClient } from '@/lib/supabase/admin'
import { ReturnRow } from './return-row'

export const dynamic = 'force-dynamic'

export default async function AdminReturnsPage() {
  const admin = createAdminClient()
  const { data: returns } = await admin
    .from('return_requests')
    .select(
      'id, reason, status, created_at, refund_amount_cents, orders(id, email, amount_total)',
    )
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Rücksendungen</h1>
      {!returns?.length ? (
        <p className="text-muted-foreground">Keine Rücksendeanfragen.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {returns.map((ret) => (
            <ReturnRow key={ret.id} ret={ret as any} />
          ))}
        </ul>
      )}
    </div>
  )
}
