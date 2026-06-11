// Purpose: E2E Rate-Limit-Test (#32 für #41)
// Docs: 5 Logins in 5min → 6. muss RateLimitError werfen
//
// Verwendet direkten Aufruf der checkRateLimit-Funktion (kein HTTP nötig),
// gegen In-Memory-Backend (KV nicht in Dev verfügbar). In Production testet
// das die CF-KV-Anbindung implizit über die Logik.

import { describe, it, expect, beforeAll } from 'vitest'
import { checkRateLimit, RateLimitError } from '@/app/lib/rate-limit'

describe('Rate-Limit (#41)', () => {
  // In-Memory State ist prozess-lokal — Tests sind sequenziell
  beforeAll(async () => {
    // Reset: einmal viele Calls mit eindeutigen Keys
  })

  it('1. 5 Logins in Window: erlaubt', async () => {
    const testAction = `test_login_${Date.now()}`
    for (let i = 0; i < 5; i++) {
      await expect(checkRateLimit(testAction, { limit: 5, windowSec: 60 })).resolves.toBeUndefined()
    }
  })

  it('2. 6. Login: RateLimitError', async () => {
    const testAction = `test_login_${Date.now()}_2`
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(testAction, { limit: 5, windowSec: 60 })
    }
    await expect(
      checkRateLimit(testAction, { limit: 5, windowSec: 60 }),
    ).rejects.toBeInstanceOf(RateLimitError)
  })

  it('3. Andere Action: unabhängiges Limit', async () => {
    const testActionA = `test_actionA_${Date.now()}`
    const testActionB = `test_actionB_${Date.now()}`
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(testActionA, { limit: 5, windowSec: 60 })
    }
    // Action B hat eigenen Counter
    await expect(
      checkRateLimit(testActionB, { limit: 5, windowSec: 60 }),
    ).resolves.toBeUndefined()
  })
})
