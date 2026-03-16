import type { ApiOrder } from '@/features/account/order-schemas'
import type { Address, Order, OrderStatus, PaymentStatus } from '@/types'

const EMPTY_ADDRESS: Address = {
  id: 'address-placeholder',
  name: 'Standard',
  street: '-',
  city: '-',
  postalCode: '-',
  country: 'Deutschland',
}

function resolveAddress(addresses: Address[]): Address {
  if (addresses.length === 0) {
    return EMPTY_ADDRESS
  }
  return addresses.find((address) => address.isDefault) || addresses[0]
}

function mapStatus(status: string): OrderStatus {
  if (status === 'pending' || status === 'confirmed' || status === 'processing' || status === 'shipped' || status === 'delivered' || status === 'cancelled' || status === 'refunded') {
    return status
  }
  if (status.includes('ship')) {
    return 'shipped'
  }
  if (status.includes('cancel')) {
    return 'cancelled'
  }
  if (status.includes('refund')) {
    return 'refunded'
  }
  return 'processing'
}

function mapPaymentStatus(status: string): PaymentStatus {
  if (status === 'pending' || status === 'paid' || status === 'failed' || status === 'refunded') {
    return status
  }
  if (status.includes('paid') || status.includes('succeed')) {
    return 'paid'
  }
  if (status.includes('fail')) {
    return 'failed'
  }
  if (status.includes('refund')) {
    return 'refunded'
  }
  return 'pending'
}

function resolveTotal(order: ApiOrder): number {
  if (typeof order.total === 'number') {
    return order.total
  }
  if (typeof order.total_amount === 'number') {
    return order.total_amount / 100
  }
  return 0
}

function resolveUnitPrice(item: NonNullable<ApiOrder['items']>[number]): number {
  if (typeof item.price === 'number') {
    return item.price
  }
  if (typeof item.unit_price_amount === 'number') {
    return item.unit_price_amount / 100
  }
  return 0
}

export function mapApiOrderToUIOrder(order: ApiOrder, userID: string, addresses: Address[]): Order {
  const address = resolveAddress(addresses)
  const total = resolveTotal(order)

  return {
    id: order.id,
    customerId: userID,
    items: (order.items || []).map((item, index) => ({
      id: item.id || `${order.id}-${index}`,
      productId: item.product_id || item.sku || 'unknown',
      productName: item.title || item.sku || 'Produkt',
      productImage: '/catalog/product-fallback.svg',
      quantity: item.quantity,
      price: resolveUnitPrice(item),
      variant: item.variant || undefined,
    })),
    status: mapStatus(order.status),
    subtotal: total,
    shipping: 0,
    tax: 0,
    total,
    shippingAddress: address,
    billingAddress: address,
    paymentMethod: 'stripe',
    paymentStatus: mapPaymentStatus(order.payment_status),
    trackingNumber: order.tracking_number || undefined,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}
