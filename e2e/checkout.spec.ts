// E2E-Skeleton: Issue #32 — vollständige Suite in #42
//
// Voraussetzungen für lokale Ausführung:
//   pnpm add -D @playwright/test
//   pnpm exec playwright install --with-deps
//   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
//   .env.test mit NEXT_PUBLIC_SUPABASE_URL, STRIPE_TEST_KEY etc.
//
// Ausführung: pnpm test:e2e

import { test, expect } from '@playwright/test'

test.describe('Checkout-Flow', () => {
  test('Warenkorb → Stripe → Success-Page', async ({ page }) => {
    await page.goto('/produkte')
    await page.getByRole('link', { name: /produkt/i }).first().click()
    await page.getByRole('button', { name: /in den warenkorb/i }).click()
    await page.goto('/warenkorb')
    await page.getByRole('link', { name: /zur kasse/i }).click()

    // Stripe-Hosted-Checkout (Testmode)
    await page.waitForURL(/checkout\.stripe\.com/)
    await page.fill('input[name="email"]', 'e2e-test@delqhi.com')
    await page.fill('input[name="cardNumber"]', '4242 4242 4242 4242')
    await page.fill('input[name="cardExpiry"]', '12 / 34')
    await page.fill('input[name="cardCvc"]', '123')
    await page.fill('input[name="billingName"]', 'E2E Test')
    await page.getByTestId('hosted-payment-submit-button').click()

    await page.waitForURL(/\/bestellung\/erfolg|kasse\/erfolg/, { timeout: 30_000 })
    await expect(page.getByText(/vielen dank|danke/i)).toBeVisible()
  })

  test('Webhook mit invalider Signatur → 400', async ({ request }) => {
    const res = await request.post('/api/stripe/webhook', {
      headers: { 'stripe-signature': 'invalid' },
      data: '{}',
    })
    expect(res.status()).toBe(400)
  })
})
