import { test, expect } from '@playwright/test';

test('End-to-End Checkout Flow', async ({ page }) => {
  // 1. Go to homepage
  await page.goto('/');
  await expect(page).toHaveTitle(/Simone Webshop/);

  // 2. Go to product page
  await page.click('a[href="/products"]');
  const firstProduct = page.locator('.product-card').first();
  await firstProduct.click();

  // 3. Add to cart
  await page.click('button:has-text("In den Warenkorb")');
  await expect(page.locator('.cart-drawer')).toBeVisible();

  // 4. Proceed to checkout
  await page.click('a:has-text("Zur Kasse")');
  await expect(page).toHaveURL(/\/checkout/);

  // 5. Fill shipping info (mock)
  await page.fill('input[name="firstName"]', 'Jeremy');
  await page.fill('input[name="lastName"]', 'Schulze');
  await page.fill('input[name="email"]', 'test@delqhi.com');
  await page.fill('input[name="address"]', 'Musterstraße 1');
  await page.fill('input[name="city"]', 'Berlin');
  await page.fill('input[name="zip"]', '10115');

  // 6. Payment step (Mock Stripe)
  await page.click('button:has-text("Weiter zur Zahlung")');
  
  // Note: For real E2E, we would mock the Stripe endpoint or use a test card
  // This is just a smoke test structure.
});
