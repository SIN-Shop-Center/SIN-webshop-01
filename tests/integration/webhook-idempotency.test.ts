// Purpose: E2E Webhook-Idempotenz-Test (#32)
// Docs: Issue #30 + #54 — doppelte Webhook-Zustellung darf nur 1 Order anlegen.
//
// Strategie (kein Stripe-CLI nötig, da Live-Stripe-Calls langsam + flaky):
//   1. Erzeuge manuell einen Stripe-Event-JSON (checkout.session.completed)
//   2. Sende ihn 2x an /api/stripe/webhook (mit frisch generierter Signatur)
//   3. Verifiziere: nur 1 Order-Row, processed_events hat 1 Row (oder 2 wegen Replay)
//
// ACHTUNG: Dieser Test schreibt in die Production-DB (TEST_MODE=true isolates
// via separater cart_id / test-only stripe_session_id). Bei Fehlschlag kann
// eine Test-Order entstehen — Cleanup erfolgt via DELETE unten.

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createHmac } from 'node:crypto'

import { createAdminClient } from '@/app/lib/supabase/admin'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_test_local'

const TEST_SESSION_ID = `cs_test_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`
const TEST_PAYMENT_INTENT = `pi_test_e2e_${Date.now()}`

function sign(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signedPayload = `${timestamp}.${payload}`
  const signature = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${signature}`
}

interface StripeSessionEvent {
  id: string
  type: 'checkout.session.completed'
  data: {
    object: {
      id: string
      payment_intent: string
      amount_total: number
      currency: string
      customer_email: string
      customer_details: { email: string; name?: string }
      collected_information: {
        shipping_details: {
          name: string
          address: {
            line1: string
            line2?: string
            city: string
            state?: string
            postal_code: string
            country: string
          }
        }
      }
      metadata: { cart_id: string; user_id: string }
    }
  }
}

function buildEvent(overrides: Partial<StripeSessionEvent['data']['object']> = {}): StripeSessionEvent {
  return {
    id: `evt_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: TEST_SESSION_ID,
        payment_intent: TEST_PAYMENT_INTENT,
        amount_total: 4990,
        currency: 'eur',
        customer_email: 'e2e-test@delqhi.com',
        customer_details: { email: 'e2e-test@delqhi.com', name: 'E2E Tester' },
        collected_information: {
          shipping_details: {
            name: 'E2E Tester',
            address: {
              line1: 'Teststraße 1',
              city: 'Berlin',
              postal_code: '10115',
              country: 'DE',
            },
          },
        },
        metadata: { cart_id: `cart_test_${Date.now()}`, user_id: '' },
        ...overrides,
      },
    },
  }
}

async function postWebhook(event: StripeSessionEvent): Promise<{ status: number; body: unknown }> {
  const payload = JSON.stringify(event)
  const sig = sign(payload, WEBHOOK_SECRET)
  const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': sig,
    },
    body: payload,
  })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // Body ist kein JSON — body bleibt der Text
  }
  return { status: res.status, body }
}

describe('Stripe-Webhook Idempotenz (#32)', () => {
  const admin = createAdminClient()
  let testEvent: StripeSessionEvent

  beforeEach(() => {
    testEvent = buildEvent()
  })

  afterAll(async () => {
    // Cleanup: Test-Order + processed_events entfernen
    await admin.from('orders').delete().eq('stripe_session_id', TEST_SESSION_ID)
    await admin.from('processed_events').delete().eq('event_id', testEvent.id)
  })

  it('1. Erstes Webhook: erstellt 1 Order', async () => {
    const res = await postWebhook(testEvent)
    expect(res.status).toBe(200)
    expect((res.body as any).duplicate).toBeFalsy()

    // DB-Check
    const { data: orders } = await admin
      .from('orders')
      .select('id, stripe_session_id, amount_total, status')
      .eq('stripe_session_id', TEST_SESSION_ID)

    expect(orders).toHaveLength(1)
    expect(orders![0].status).toBe('paid')
    expect(orders![0].amount_total).toBe(4990)
  }, 30_000)

  it('2. Zweites Webhook (Re-Play): KEINE zweite Order', async () => {
    // Re-use the same event.id → processed_events should catch it
    const res = await postWebhook(testEvent)
    expect(res.status).toBe(200)
    expect((res.body as any).duplicate).toBe(true)

    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(count).toBe(1)
  }, 30_000)

  it('3. Drittes Webhook mit neuem event.id aber gleicher session: KEINE zweite Order', async () => {
    // Re-Play-Angriff mit anderem event.id → orders UNIQUE-Constraint fängt ab
    const replayEvent = { ...testEvent, id: `evt_e2e_replay_${Date.now()}` }
    const res = await postWebhook(replayEvent)
    expect(res.status).toBe(200)
    // Entweder duplicate (processed_events fing's ab) oder OK aber Order existiert schon
    // Wichtig: KEIN 500-Fehler, keine 2. Order
    expect([200]).toContain(res.status)

    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(count).toBe(1)

    // Cleanup des Replay-Events
    await admin.from('processed_events').delete().eq('event_id', replayEvent.id)
  }, 30_000)

  it('4. Webhook mit invalider Signatur: 400, keine Order', async () => {
    const payload = JSON.stringify(testEvent)
    const res = await fetch(`${BASE_URL}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1234,v1=invalidsig',
      },
      body: payload,
    })
    expect(res.status).toBe(400)
  }, 10_000)
})
