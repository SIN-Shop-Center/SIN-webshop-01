// Purpose: Retention cleanup + atomic release of stale cart reservations.
// Auth: Authorization: Bearer $CRON_SECRET

import { NextResponse } from 'next/server'

import { isCronAuthorized } from '@/lib/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function cleanupExpiredExports(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ deleted: number; error?: string }> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  const bucket = admin.storage.from('data-exports')
  const { data: userFolders, error: folderError } = await bucket.list('exports', {
    limit: 100,
  })

  if (folderError) {
    if (/not found|does not exist/i.test(folderError.message)) return { deleted: 0 }
    return { deleted: 0, error: folderError.message }
  }

  const expiredPaths: string[] = []
  for (const folder of userFolders ?? []) {
    if (!folder.name || folder.id) continue
    const prefix = `exports/${folder.name}`
    const { data: files, error } = await bucket.list(prefix, { limit: 100 })
    if (error) return { deleted: expiredPaths.length, error: error.message }

    for (const file of files ?? []) {
      const createdAt = new Date(String(file.created_at || '')).getTime()
      if (file.id && Number.isFinite(createdAt) && createdAt < cutoff) {
        expiredPaths.push(`${prefix}/${file.name}`)
      }
    }
  }

  if (expiredPaths.length === 0) return { deleted: 0 }
  const { error: removeError } = await bucket.remove(expiredPaths)
  return removeError
    ? { deleted: 0, error: removeError.message }
    : { deleted: expiredPaths.length }
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: released, error: reservationError } = await admin.rpc(
    'cleanup_stale_reservations',
  )
  if (reservationError) {
    console.error('[retention-cleanup] stale reservation cleanup failed:', reservationError.message)
    return NextResponse.json({ error: 'reservation cleanup failed' }, { status: 500 })
  }

  const eventsCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const cspCutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString()
  const [eventsResult, contactsResult, cspResult, exportResult] = await Promise.all([
    admin
      .from('processed_events')
      .delete({ count: 'exact' })
      .lt('processed_at', eventsCutoff),
    admin
      .from('contact_messages')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString()),
    admin
      .from('csp_violations')
      .delete({ count: 'exact' })
      .lt('received_at', cspCutoff),
    cleanupExpiredExports(admin),
  ])

  const errors = [
    eventsResult.error ? `processed_events: ${eventsResult.error.message}` : null,
    contactsResult.error ? `contact_messages: ${contactsResult.error.message}` : null,
    cspResult.error ? `csp_violations: ${cspResult.error.message}` : null,
    exportResult.error ? `data_exports: ${exportResult.error}` : null,
  ].filter((error): error is string => Boolean(error))

  if (errors.length > 0) {
    console.error('[retention-cleanup] partial failure:', errors)
    return NextResponse.json(
      {
        error: 'retention cleanup partially failed',
        reservationsReleased: Number(released) || 0,
        details: errors,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    reservationsReleased: Number(released) || 0,
    eventsDeleted: eventsResult.count ?? 0,
    contactMessagesDeleted: contactsResult.count ?? 0,
    cspViolationsDeleted: cspResult.count ?? 0,
    exportFilesDeleted: exportResult.deleted,
  })
}
