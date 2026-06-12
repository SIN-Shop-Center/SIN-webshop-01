// Purpose: CJ order forwarding + tracking (Step 7 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 7 — CJ Dropshipping integration)

import 'server-only'

import { cjRequest } from '@/lib/cj/client'
import { getCheapestFreight } from '@/lib/cj/freight'

export interface CjOrderProduct {
  vid: string // CJ variant id
  quantity: number
}

export interface CjShippingAddress {
  name: string
  phone: string
  email: string
  country: string // ISO-2, z.B. DE
  province: string
  city: string
  address: string
  address2?: string
  zip: string
}

export async function createCjOrder(params: {
  orderNumber: string
  shipping: CjShippingAddress
  products: CjOrderProduct[]
  logisticName?: string
}): Promise<{ cjOrderId: string; logisticName: string; freightUsd: number }> {
  let logisticName = params.logisticName ?? 'CJPacket Ordinary'
  let freightUsd = 0

  try {
    const freight = await getCheapestFreight({
      items: params.products.map((p) => ({ cj_variant_id: p.vid, quantity: p.quantity })),
      countryCode: params.shipping.country,
    })
    if (freight) {
      logisticName = freight.logisticName
      freightUsd = freight.priceUsd
    }
  } catch {
    // Fallback to default logistic — freight failure not fatal
  }

  const data = await cjRequest<{ orderId: string }>(
    '/shopping/order/createOrderV2',
    {
      method: 'POST',
      body: {
        orderNumber: params.orderNumber,
        shippingZip: params.shipping.zip,
        shippingCountryCode: params.shipping.country,
        shippingCountry: params.shipping.country,
        shippingProvince: params.shipping.province,
        shippingCity: params.shipping.city,
        shippingAddress: params.shipping.address,
        shippingAddress2: params.shipping.address2 ?? '',
        shippingCustomerName: params.shipping.name,
        shippingPhone: params.shipping.phone,
        email: params.shipping.email,
        logisticName,
        fromCountryCode: 'CN',
        payType: 2,
        products: params.products,
      },
    },
  )

  return { cjOrderId: data.orderId, logisticName, freightUsd }
}

export async function getCjOrderDetail(cjOrderId: string): Promise<{
  orderStatus: string
  trackNumber: string | null
}> {
  const data = await cjRequest<{
    orderStatus: string
    trackNumber?: string
  }>('/shopping/order/getOrderDetail', {
    query: { orderId: cjOrderId },
  })

  return {
    orderStatus: data.orderStatus,
    trackNumber: data.trackNumber || null,
  }
}
