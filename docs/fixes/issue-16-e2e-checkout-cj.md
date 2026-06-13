# Fix #16 — E2E-Test: Stripe → CJ-Bestellflow (nach Balance-Funding)

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/16

## Context

We have Stripe checkout + CJ fulfillment, but no automated end-to-end test that proves a paid order actually creates a CJ order. After #13 (wallet funded) lands, this E2E test becomes possible.

## Architecture

```
Playwright (headless)
   ↓
1. Browse to /produkte, add product to cart
2. Cart → checkout → Stripe test card
3. Stripe webhook → order in shop.orders
4. Cron cj-fulfillment → CJ order create
5. Assert: shop.orders.cj_order_id is set
```

## Test scope (must be run on staging, not production)

- **Real Stripe test mode** (use `sk_test_*`)
- **Real CJ sandbox** (no such thing → use a low-cost item, set payment-on-delivery, then cancel)
- **Real Supabase staging project** (mirror of prod schema, fake data)
- **Stripe CLI** for webhook forwarding

## Required env (test secrets in GitHub Actions)

```
STAGING_SUPABASE_URL=
STAGING_SUPABASE_SERVICE_ROLE=
STRIPE_TEST_KEY=sk_test_...
STRIPE_TEST_WEBHOOK_SECRET=whsec_...
CJ_SANDBOX_TOKEN=
```

## `playwright.config.ts` additions

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
```

## `tests/e2e/checkout-cj.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('full Stripe → CJ order flow', async ({ page, request }) => {
  // 1. Add product to cart
  await page.goto('/')
  await page.getByTestId('product-card').first().click()
  await page.getByTestId('add-to-cart').click()
  await page.goto('/warenkorb')

  // 2. Start checkout
  await page.getByTestId('checkout').click()

  // 3. Fill Stripe test card
  await page.locator('[name="cardNumber"]').fill('4242 4242 4242 4242')
  await page.locator('[name="cardExpiry"]').fill('12/30')
  await page.locator('[name="cardCvc"]').fill('123')
  await page.locator('[name="billingName"]').fill('E2E Test')
  await page.getByTestId('pay').click()

  // 4. Wait for Stripe redirect to success page
  await page.waitForURL(/\/kasse\/erfolg/, { timeout: 30_000 })
  const sessionId = new URL(page.url()).searchParams.get('session_id')!

  // 5. Poll: order exists, cj_order_id eventually set
  let order: any
  for (let i = 0; i < 30; i++) {
    const res = await request.get(
      `/api/test/order-by-session?session=${sessionId}`,
      { headers: { 'X-Test-Auth': process.env.E2E_AUTH! } },
    )
    if (res.ok()) {
      order = await res.json()
      if (order.cj_order_id) break
    }
    await page.waitForTimeout(2_000)
  }

  expect(order).toBeDefined()
  expect(order.payment_status).toBe('paid')
  expect(order.fulfillment_status).toBe('submitted')
  expect(order.cj_order_id).toMatch(/^\d+$/)
  expect(order.tracking_number).toBeTruthy()
})
```

## `app/api/test/order-by-session/route.ts` (test-only)

```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  // only available in test mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 })
  }
  if (req.headers.get('x-test-auth') !== process.env.E2E_AUTH) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sessionId = new URL(req.url).searchParams.get('session')
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single()

  return NextResponse.json(data)
}
```

## CI: `.github/workflows/e2e.yml`

```yaml
name: E2E
on:
  workflow_dispatch:
  pull_request:
    branches: [main]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
        env:
          E2E_BASE_URL: https://staging.shopsin.delqhi.com
          STAGING_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          STAGING_SUPABASE_SERVICE_ROLE: ${{ secrets.STAGING_SUPABASE_SERVICE_ROLE }}
          STRIPE_TEST_KEY: ${{ secrets.STRIPE_TEST_KEY }}
          STRIPE_TEST_WEBHOOK_SECRET: ${{ secrets.STRIPE_TEST_WEBHOOK_SECRET }}
          CJ_SANDBOX_TOKEN: ${{ secrets.CJ_SANDBOX_TOKEN }}
          E2E_AUTH: ${{ secrets.E2E_AUTH }}
```

## Acceptance

- Test passes locally AND in CI
- Total runtime < 90s
- On failure: Playwright trace + video uploaded as artifacts

## Closing

```sh
gh issue close 16 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Playwright E2E + CI workflow grün. Stripe test card 4242 → CJ order createt."
```
