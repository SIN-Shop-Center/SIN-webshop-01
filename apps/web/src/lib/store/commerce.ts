import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_RECENTLY_VIEWED = 8
const MAX_COMPARE = 4

interface CommerceState {
  recentlyViewedIds: string[]
  compareIds: string[]
  recordViewedProduct: (productId: string) => void
  toggleCompareProduct: (productId: string) => void
  clearComparedProducts: () => void
  removeComparedProduct: (productId: string) => void
}

export const useCommerceStore = create<CommerceState>()(
  persist(
    (set) => ({
      recentlyViewedIds: [],
      compareIds: [],
      recordViewedProduct: (productId) =>
        set((state) => ({
          recentlyViewedIds: [productId, ...state.recentlyViewedIds.filter((id) => id !== productId)].slice(
            0,
            MAX_RECENTLY_VIEWED,
          ),
        })),
      toggleCompareProduct: (productId) =>
        set((state) => {
          if (state.compareIds.includes(productId)) {
            return { compareIds: state.compareIds.filter((id) => id !== productId) }
          }

          return {
            compareIds: [...state.compareIds, productId].slice(-MAX_COMPARE),
          }
        }),
      clearComparedProducts: () => set({ compareIds: [] }),
      removeComparedProduct: (productId) =>
        set((state) => ({ compareIds: state.compareIds.filter((id) => id !== productId) })),
    }),
    { name: 'simone-commerce' },
  ),
)
