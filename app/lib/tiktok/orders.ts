// Purpose: TikTok Shop Order API — offene Orders abrufen, Tracking zurückmelden
// Docs: docs/SIN_TIKTOK_MASTER_PIPELINE.md (Stufe 5)
// API-Version: 202309 (Order + Fulfillment API)

import 'server-only'

import { tiktokRequest } from '@/lib/tiktok/client'

export interface TikTokOrderLineItem {
  id: string
  product_id: string
  sku_id: string
  seller_sku: string
  product_name: string
  sale_price: string
  currency: string
}

export interface TikTokOrder {
  id: string
  status: string
  create_time: number
  line_items: TikTokOrderLineItem[]
  recipient_address: {
    name: string
    phone_number: string
    address_line1: string
    address_line2?: string
    postal_code: string
    city?: string
    state?: string
    region_code: string
    full_address: string
  }
}

export async function getAwaitingShipmentOrders(): Promise<TikTokOrder[]> {
  const data = await tiktokRequest<{
    orders: TikTokOrder[]
    next_page_token?: string
  }>('/order/202309/orders/search', {
    method: 'POST',
    query: { page_size: '50' },
    body: {
      order_status: 'AWAITING_SHIPMENT',
    },
  })
  return data.orders ?? []
}

export async function getOrderDetail(orderIds: string[]): Promise<TikTokOrder[]> {
  const data = await tiktokRequest<{ orders: TikTokOrder[] }>('/order/202309/orders', {
    method: 'GET',
    query: { ids: orderIds.join(',') },
  })
  return data.orders ?? []
}

export async function shipTikTokOrder(params: {
  orderId: string
  trackingNumber: string
  shippingProviderId: string
}): Promise<void> {
  await tiktokRequest(`/fulfillment/202309/orders/${params.orderId}/packages`, {
    method: 'POST',
    body: {
      tracking_number: params.trackingNumber,
      shipping_provider_id: params.shippingProviderId,
    },
  })
}

export async function getShippingProviders(deliveryOptionId: string) {
  const data = await tiktokRequest<{
    shipping_providers: Array<{ id: string; name: string }>
  }>(`/logistics/202309/delivery_options/${deliveryOptionId}/shipping_providers`, {
    method: 'GET',
  })
  return data.shipping_providers ?? []
}
