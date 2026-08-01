// Purpose: Browse → Product → Add to Cart Flow (Issue #32 E2E)
// Docs: Validates the most critical revenue path end-to-end.

import { test, expect } from '@playwright/test'

test.describe('Browse & Product', () => {
  test('Startseite lädt mit Hero + Featured-Produkten', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Delqhi|Shop/i)
    // Hero oder featured-Products sichtbar
    const heroOrProducts = page.locator(
      'main h1, [data-testid="product-card"]',
    )
    await expect(heroOrProducts.first()).toBeVisible()
  })

  test('Produktliste zeigt Produkte', async ({ page }) => {
    await page.goto('/produkte')
    // Mindestens ein Produkt-Link
    const productLinks = page.locator('a[href^="/produkt/"], a[href*="/produkte/"]')
    await expect(productLinks.first()).toBeVisible({ timeout: 15_000 })
  })

  test('Produkt-Detail lädt mit Preis + Add-to-Cart-Button', async ({
    page,
    request,
  }) => {
    // Hole ein Produkt aus dem API oder nutze erstes Link auf /produkte
    await page.goto('/produkte')
    const firstProductLink = page
      .locator('a[href*="/produkt/"]')
      .first()
    await firstProductLink.waitFor({ state: 'visible', timeout: 15_000 })
    const href = await firstProductLink.getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)
    // Add-to-Cart sichtbar (oder Stock-Alert wenn ausverkauft)
    const addButton = page.getByRole('button', {
      name: /in den warenkorb|benachrichtigen/i,
    })
    await expect(addButton.first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Cart', () => {
  test('Empty Cart zeigt Empty-State', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/warenkorb')
    await expect(
      page.getByText(/leer|weiter einkaufen/i).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('Add to Cart flow: Produktseite → Cart hat Item', async ({ page }) => {
    // Navigiere zu /produkte und klicke erstes Produkt
    await page.goto('/produkte')
    const firstProduct = page
      .locator('a[href*="/produkt/"]')
      .first()
    await firstProduct.waitFor({ state: 'visible', timeout: 15_000 })
    const productHref = await firstProduct.getAttribute('href')
    expect(productHref).toBeTruthy()
    await Promise.all([
      page.waitForURL((url) => url.pathname === productHref),
      firstProduct.click(),
    ])

    // Only interact with the PDP control after client-side navigation completed.
    const addButton = page.getByTestId('add-to-cart-button')
    await expect(addButton).toBeVisible()
    await addButton.click()
    await expect(page.getByTestId('add-to-cart-button')).toHaveAttribute('data-state', 'added')
    await expect(page.getByTestId('add-to-cart-status')).toHaveText(
      'Produkt wurde zum Warenkorb hinzugefügt',
    )

    const cartCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'sin_cart_id')
    expect(cartCookie?.value, 'addToCart must persist the guest cart cookie').toBeTruthy()
    const cartResponse = await page.request.get('/api/cart')
    expect(cartResponse.ok()).toBeTruthy()
    const cartPayload = await cartResponse.json()
    expect(cartPayload.items).toHaveLength(1)

    // Navigiere zum Warenkorb
    await page.goto('/warenkorb')
    await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible()
  })
})
