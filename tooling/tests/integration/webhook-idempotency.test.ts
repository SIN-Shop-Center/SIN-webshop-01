import { createHmac } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createAdminClient } from '@/lib/supabase/admin'

const WEBHOOK_SECRET = 'whsec_local_integration_contract'
const TEST_SESSION_ID = 'cs_test_e2e_idempotency_contract'
const TEST_PRODUCT_ID = '00000000-0000-4000-8000-000000000102'
const EVENT_ID = 'evt_e2e_idempotency_contract'

const stripeMocks = vi.hoisted(() => ({
  constructEvent(payload: string, signature: string, secret: string) {
    const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1]
    const received = signature.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1]
    if (!timestamp || !received) throw new Error('Invalid signature')
    const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
    if (received !== expected) throw new Error('Invalid signature')
    return JSON.parse(payload)
  },
  async listLineItems() {
    return {
      data: [{
        description: 'E2E Testprodukt',
        quantity: 1,
        price: {
          unit_amount: 4990,
          product: { metadata: { product_id: TEST_PRODUCT_ID, variant_id: '' } },
        },
      }],
    }
  },
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: stripeMocks.constructEvent },
    checkout: { sessions: { listLineItems: stripeMocks.listLineItems } },
  }),
}))
vi.mock('@/lib/emails/send', () => ({ sendOrderConfirmation: vi.fn(async () => undefined) }))
vi.mock('@/lib/fulfillment/submit-order', () => ({
  submitOrderToCj: vi.fn(async () => ({ ok: true })),
}))

import { POST } from '@/app/api/stripe/webhook/route'

const destructiveTestsEnabled =
  process.env.ALLOW_DESTRUCTIVE_INTEGRATION_TESTS === 'true' &&
  Boolean(process.env.TEST_SUPABASE_URL) &&
  Boolean(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
const describeDatabase = destructiveTestsEnabled ? describe.sequential : describe.skip

function buildEvent(id = EVENT_ID) {
  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: TEST_SESSION_ID,
        payment_intent: 'pi_test_e2e_idempotency_contract',
        amount_total: 4990,
        currency: 'eur',
        customer_email: 'e2e-webhook@tests.invalid',
        customer_details: { email: 'e2e-webhook@tests.invalid', name: 'E2E Tester' },
        collected_information: {
          shipping_details: {
            name: 'E2E Tester',
            address: { line1: 'Teststrasse 1', city: 'Berlin', postal_code: '10115', country: 'DE' },
          },
        },
        metadata: { cart_id: '00000000-0000-4000-8000-000000000107', user_id: '' },
      },
    },
  }
}

function signedRequest(event: ReturnType<typeof buildEvent>, signatureOverride?: string) {
  const payload = JSON.stringify(event)
  const timestamp = Math.floor(Date.now() / 1000)
  const signature = signatureOverride ?? `t=${timestamp},v1=${createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex')}`
  return new Request('http://127.0.0.1:4173/api/stripe/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': signature },
    body: payload,
  })
}

describeDatabase('Stripe webhook signature and idempotency', () => {
  const admin = createAdminClient()

  beforeAll(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
    await admin.from('orders').delete().eq('stripe_session_id', TEST_SESSION_ID)
    await admin.from('processed_events').delete().like('event_id', 'evt_e2e_idempotency%')
  })

  afterAll(async () => {
    await admin.from('orders').delete().eq('stripe_session_id', TEST_SESSION_ID)
    await admin.from('processed_events').delete().like('event_id', 'evt_e2e_idempotency%')
  })

  it('rejects an invalid signature without writing an order', async () => {
    const response = await POST(signedRequest(buildEvent(), 't=1234,v1=invalid'))
    expect(response.status).toBe(400)
    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(count).toBe(0)
  })

  it('writes one order for a valid signed event', async () => {
    const response = await POST(signedRequest(buildEvent()))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ received: true })
    const { data } = await admin
      .from('orders')
      .select('status, amount_total')
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(data).toEqual([{ status: 'paid', amount_total: 4990 }])
  })

  it('acknowledges the same event without creating a second order', async () => {
    const response = await POST(signedRequest(buildEvent()))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ duplicate: true })
    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(count).toBe(1)
  })

  it('uses stripe_session_id as authority when a new event ID is replayed', async () => {
    const response = await POST(signedRequest(buildEvent('evt_e2e_idempotency_replay')))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ duplicate: true })
    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('stripe_session_id', TEST_SESSION_ID)
    expect(count).toBe(1)
  })
})
