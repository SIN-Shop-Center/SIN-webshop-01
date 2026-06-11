// Purpose: TikTok Shop Return/Refund API — Retouren abrufen und beantworten
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Stufe 5, Erweiterung)
// API-Version: 202309 (Return & Refund API)

import 'server-only'

import { tiktokRequest } from '@/lib/tiktok/client'

export interface TikTokReturn {
  return_id: string
  order_id: string
  return_type: string
  return_status: string
  return_reason: string
  refund_amount?: { refund_total: string; currency: string }
  create_time: number
}

export async function getPendingReturns(): Promise<TikTokReturn[]> {
  const data = await tiktokRequest<{
    return_orders: TikTokReturn[]
    next_page_token?: string
  }>('/return_refund/202309/returns/search', {
    method: 'POST',
    query: { page_size: '50' },
    body: {
      return_status: ['RETURN_OR_REFUND_REQUEST_PENDING'],
    },
  })
  return data.return_orders ?? []
}

export async function approveReturn(returnId: string): Promise<void> {
  await tiktokRequest(`/return_refund/202309/returns/${returnId}/approve`, {
    method: 'POST',
    body: {},
  })
}

export async function rejectReturn(params: { returnId: string; reason: string }): Promise<void> {
  await tiktokRequest(`/return_refund/202309/returns/${params.returnId}/reject`, {
    method: 'POST',
    body: { decision_reason: params.reason },
  })
}
