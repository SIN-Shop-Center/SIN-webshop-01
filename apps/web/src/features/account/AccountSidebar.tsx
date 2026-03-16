import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { ACTIVE_TAB_ICON, ACCOUNT_TABS } from '@/features/account/constants'
import type { AccountDisplayUser, TabType } from '@/features/account/types'

interface AccountSidebarProps {
  user: AccountDisplayUser
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  onLogout: () => void
}

export function AccountSidebar({ user, activeTab, onTabChange, onLogout }: AccountSidebarProps) {
  return (
    <aside className="panel sticky top-24 p-6">
      <div className="mb-6 border-b border-brand-border pb-6 text-center">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-brand-accent text-3xl font-semibold text-white">
          {user.name.charAt(0)}
        </div>
        <p className="text-lg font-semibold text-brand-text">{user.name}</p>
        <p className="text-sm text-brand-text-muted">{user.email}</p>
      </div>

      <nav className="space-y-1" aria-label="Kundencenter Bereiche">
        {ACCOUNT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={[
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              activeTab === tab.id
                ? 'bg-brand-bg-muted text-brand-accent'
                : 'text-brand-text-muted hover:bg-brand-bg-muted hover:text-brand-text',
            ].join(' ')}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
            {activeTab === tab.id ? <ACTIVE_TAB_ICON className="ml-auto h-4 w-4" /> : null}
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-6 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
        <span>Abmelden</span>
      </button>
    </aside>
  )
}
