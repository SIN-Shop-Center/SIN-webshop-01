// Purpose: Fail-closed authentication for all privileged cron endpoints.

import 'server-only'

import { timingSafeEqual } from 'node:crypto'

const MIN_SECRET_LENGTH = 20

export function isCronAuthorized(request: Request): boolean {
  const secret = String(process.env.CRON_SECRET || '').trim()
  if (secret.length < MIN_SECRET_LENGTH) {
    console.error('[cron-auth] CRON_SECRET is missing or too short')
    return false
  }

  const actual = String(request.headers.get('authorization') || '')
  const expected = `Bearer ${secret}`
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(actualBuffer, expectedBuffer)
}
