import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer } from '@/types'

interface UserState {
  user: Customer | null
  isAuthenticated: boolean
  login: (customer: Customer) => void
  logout: () => void
  updateUser: (data: Partial<Customer>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (customer: Customer) => set({ user: customer, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (data: Partial<Customer>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    { name: 'simone-user' },
  ),
)
