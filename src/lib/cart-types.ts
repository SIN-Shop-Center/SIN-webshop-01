import type { Product } from '@/lib/data'

export interface CartItem {
  id: string
  product_id: string
  quantity: number
  variant_id?: string
}

export type CartLineItem = {
  item: CartItem
  product: Product
}
