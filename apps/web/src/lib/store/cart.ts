import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types'
import { getMaxQuantity, normalizeProduct, recalculateTotals, sanitizeQuantity, type CartProductInput } from './cart-utils'

interface CartState {
  items: CartItem[]
  addItem: (product: CartProductInput, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      itemCount: 0,
      addItem: (rawProduct: CartProductInput, quantity = 1) => {
        const product = normalizeProduct(rawProduct)
        const requestedQuantity = sanitizeQuantity(quantity)
        const maxAllowed = getMaxQuantity(product)
        const image = product.images?.[0] || '/placeholder.jpg'

        if (maxAllowed < 1) {
          return
        }

        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id)
          if (existingItem) {
            const nextQuantity = Math.min(existingItem.quantity + requestedQuantity, maxAllowed)
            const items = state.items.map((item) =>
              item.product.id === product.id
                ? { ...item, product, name: product.name, price: product.price, image, quantity: nextQuantity }
                : item,
            )
            return { items, ...recalculateTotals(items) }
          }

          const safeQuantity = Math.min(requestedQuantity, maxAllowed)
          const items = [
            ...state.items,
            {
              id: crypto.randomUUID(),
              product,
              productId: product.id,
              name: product.name,
              image,
              price: product.price,
              quantity: safeQuantity,
            },
          ]

          return { items, ...recalculateTotals(items) }
        })
      },
      removeItem: (productId: string) => {
        set((state) => {
          const items = state.items.filter((item) => item.product.id !== productId)
          return { items, ...recalculateTotals(items) }
        })
      },
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(productId)
          return
        }

        set((state) => {
          const requestedQuantity = sanitizeQuantity(quantity)
          const items = state.items.flatMap((item) => {
            if (item.product.id !== productId) {
              return [item]
            }
            const maxAllowed = getMaxQuantity(item.product)
            if (maxAllowed < 1) {
              return []
            }
            return [{ ...item, quantity: Math.min(requestedQuantity, maxAllowed) }]
          })
          return { items, ...recalculateTotals(items) }
        })
      },
      clearCart: () => set({ items: [], total: 0, itemCount: 0 }),
    }),
    { name: 'simone-cart' },
  ),
)
