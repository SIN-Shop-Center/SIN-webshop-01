'use client'

import { useState } from 'react'
import { AccountContent } from '@/features/account/AccountContent'
import { AccountHeader } from '@/features/account/AccountHeader'
import { AccountSidebar } from '@/features/account/AccountSidebar'
import { AddressModal } from '@/features/account/AddressModal'
import { useAccountData } from '@/features/account/hooks'
import type { TabType } from '@/features/account/types'
import { useUserStore } from '@/lib/store'
import type { Address } from '@/types'

export function AccountPageShell() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const { user, logout } = useUserStore()
  const { data, ordersState, profileState } = useAccountData(user)

  const closeAddressModal = () => {
    setShowAddressModal(false)
    setEditingAddress(null)
  }

  const openAddressCreate = () => {
    setEditingAddress(null)
    setShowAddressModal(true)
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/logout'
  }

  return (
    <main className="shell-container py-10">
      <AccountHeader />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <AccountSidebar user={data.displayUser} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />
        <AccountContent
          activeTab={activeTab}
          data={data}
          profileState={profileState}
          ordersState={ordersState}
          onCreateAddress={openAddressCreate}
          onEditAddress={(address) => {
            setEditingAddress(address)
            setShowAddressModal(true)
          }}
        />
      </div>

      <AddressModal open={showAddressModal || !!editingAddress} editingAddress={editingAddress} onClose={closeAddressModal} />
    </main>
  )
}
