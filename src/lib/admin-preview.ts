import 'server-only'

type AdminPreviewEnvironment = Partial<Record<'ADMIN_LOCAL_PREVIEW' | 'NODE_ENV' | 'CI', string>>

/**
 * Explicit local-only escape hatch for reviewing the admin UI without external
 * services. Production and CI remain fail-closed even when the flag is set.
 */
export function isAdminLocalPreviewEnabled(
  env: AdminPreviewEnvironment = process.env,
): boolean {
  return (
    env.ADMIN_LOCAL_PREVIEW === 'true' &&
    env.NODE_ENV !== 'production' &&
    env.CI !== 'true'
  )
}
