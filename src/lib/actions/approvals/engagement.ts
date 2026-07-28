'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { createPublicAdminClient } from '@/lib/supabase/admin'

export async function approveEngagementDraft(draftId: string) {
  const user = await requireAdmin()
  const control = createPublicAdminClient()
  const { error } = await control
    .from('engagement_drafts')
    .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('status', 'draft')
  if (error) throw error
  revalidatePath('/admin/freigaben')
}

export async function rejectEngagementDraft(draftId: string) {
  await requireAdmin()
  const control = createPublicAdminClient()
  const { error } = await control
    .from('engagement_drafts')
    .update({ status: 'rejected' })
    .eq('id', draftId)
    .eq('status', 'draft')
  if (error) throw error
  revalidatePath('/admin/freigaben')
}
