// Purpose: Cron — offene TikTok-Retouren verarbeiten
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md
//
// Schedule: 1x täglich (z.B. "0 5 * * *" via GitHub Action)
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { sendPipelineAlert } from '@/lib/tiktok/alerts'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveReturn, getPendingReturns } from '@/lib/tiktok/returns'

export const maxDuration = 300

const AUTO_APPROVE_LIMIT = Number(process.env.TIKTOK_RETURN_AUTO_APPROVE_LIMIT ?? '15')

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const returns = await getPendingReturns()

  let autoApproved = 0
  const needsReview: string[] = []
  const errors: string[] = []

  for (const ret of returns) {
    try {
      const amount = Number(ret.refund_amount?.refund_total ?? 0)

      if (amount > 0 && amount <= AUTO_APPROVE_LIMIT) {
        await approveReturn(ret.return_id)
        autoApproved++

        await supabase
          .from('tiktok_orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('tiktok_order_id', ret.order_id)
      } else {
        needsReview.push(
          `Return ${ret.return_id} (Order ${ret.order_id}): ${ret.refund_amount?.refund_total ?? '?'} ${ret.refund_amount?.currency ?? ''} — Grund: ${ret.return_reason}`,
        )
      }
    } catch (e) {
      errors.push(`${ret.return_id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
    await new Promise((r) => setTimeout(r, 1100))
  }

  if (needsReview.length > 0) {
    await sendPipelineAlert({
      subject: `${needsReview.length} Retoure(n) brauchen manuelle Entscheidung`,
      errors: needsReview,
    })
  }
  if (errors.length > 0) {
    await sendPipelineAlert({ subject: `${errors.length} Retoure-Fehler`, errors })
  }

  return NextResponse.json({
    checked: returns.length,
    autoApproved,
    needsReview: needsReview.length,
    errors,
  })
}
