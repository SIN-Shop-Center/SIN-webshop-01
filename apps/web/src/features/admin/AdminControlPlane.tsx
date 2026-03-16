'use client'

import { ADMIN_WORKSPACE_LINKS } from '@/features/admin/constants'
import { useSystemHealth, useWarRoomAlerts } from '@/features/admin/hooks'
import { OnboardingGate } from '@/features/admin/OnboardingGate'
import { AdminHubHeader } from './control-plane/AdminHubHeader'
import { AdminOperationSurfacesSection } from './control-plane/AdminOperationSurfacesSection'
import { AdminSystemHealthCard } from './control-plane/AdminSystemHealthCard'
import { AdminWarRoomAlertsCard } from './control-plane/AdminWarRoomAlertsCard'
import { AdminWorkspacesSection } from './control-plane/AdminWorkspacesSection'

export function AdminControlPlane() {
  const { loading, error, data } = useWarRoomAlerts()
  const health = useSystemHealth()
  const triggeredAlerts = (data?.alerts || []).filter((alert) => alert.triggered)
  const healthySystems = health.filter((entry) => entry.ok).length
  const visibleWorkspaces = ADMIN_WORKSPACE_LINKS.filter((item) => item.href !== '/admin')

  return (
    <main className="pb-10">
      <AdminHubHeader
        workspacesCount={visibleWorkspaces.length}
        triggeredAlertsCount={triggeredAlerts.length}
        healthySystemsCount={healthySystems}
        systemsCount={health.length}
      />

      <OnboardingGate />

      <AdminWorkspacesSection workspaces={visibleWorkspaces} />

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <AdminSystemHealthCard health={health} />
        <AdminWarRoomAlertsCard loading={loading} error={Boolean(error)} alerts={data?.alerts || []} />
      </section>

      <AdminOperationSurfacesSection />
    </main>
  )
}
