export type OrderItem = {
  title: string
  quantity: number
  unit_amount: number
}

export type ShippingAddress = {
  name: string | null
  address: {
    line1: string | null
    line2?: string | null
    city: string | null
    state?: string | null
    postal_code: string | null
    country: string | null
  } | null
  phone?: string | null
}

export type OrderData = {
  orderId: string
  items: OrderItem[]
  totalCents: number
  currency?: string
  shippingAddress?: ShippingAddress | null
  email?: string
}
