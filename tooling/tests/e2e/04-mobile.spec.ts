// Purpose: Mobile-Chromium flow with a deterministic phone viewport
// Docs: Touch-Targets ≥44px, Sticky-Cart-Bar, Swipe-Gallery

import { test, expect } from '@playwright/test'

test.describe('Mobile Chromium', () => {
  test('Startseite passt in Mobile-Viewport', async ({ page }) => {
    await page.goto('/')
    // Mobile-Breite
    const viewport = page.viewportSize()
    expect(viewport?.width).toBeLessThan(500)

    // Body scrollt horizontal nicht
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth
    })
    expect(overflowX).toBeLessThanOrEqual(2) // 2px Toleranz für Sub-Pixel
  })

  test('Touch-Targets erfüllen WCAG 2.2 AA Minimum', async ({ page }) => {
    await page.goto('/')
    const tooSmall = await page.locator('button, a[href]').evaluateAll((targets) =>
      targets.flatMap((target) => {
        const element = target as HTMLElement
        const style = window.getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        const isScreenReaderOnly = element.classList.contains('sr-only')
        const isInlineTextLink = style.display === 'inline'
        const isVisible =
          style.visibility !== 'hidden' &&
          style.display !== 'none' &&
          rect.width > 0 &&
          rect.height > 0

        // WCAG 2.5.8 exempts targets in a sentence or text block. The skip link
        // is validated separately as a keyboard target after it receives focus.
        if (!isVisible || isScreenReaderOnly || isInlineTextLink) return []
        if (rect.width >= 24 && rect.height >= 24) return []

        const text = element.textContent?.trim().slice(0, 30) || element.getAttribute('aria-label') || '(empty)'
        return [`${text}: ${Math.round(rect.width)}x${Math.round(rect.height)}`]
      }),
    )
    expect(tooSmall, `Found: ${tooSmall.join('\n')}`).toHaveLength(0)
  })

  test('Cart Mobile Sticky-Bar sichtbar mit Items', async ({ page }) => {
    await page.goto('/produkte')
    const firstProduct = page.locator('a[href*="/produkt/"]').first()
    await expect(firstProduct).toBeVisible()
    const productHref = await firstProduct.getAttribute('href')
    expect(productHref).toBeTruthy()
    await page.goto(productHref!)

    const addButton = page.getByTestId('add-to-cart-button')
    await expect(addButton).toBeVisible()
    await addButton.click()
    await expect(addButton).toHaveAttribute('data-state', 'added')

    await page.goto('/warenkorb')
    await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible()
    await expect(page.getByTestId('sticky-checkout')).toBeVisible()

    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth
    })
    expect(overflowX).toBeLessThanOrEqual(2)
  })

  test('Form-Inputs haben 16px+ Font (iOS-Zoom-Schutz)', async ({ page }) => {
    await page.goto('/auth/login')
    const emailInput = page.locator('input[type="email"]').first()
    if (await emailInput.isVisible()) {
      const fontSize = await emailInput.evaluate(
        (el) => window.getComputedStyle(el).fontSize,
      )
      const px = parseFloat(fontSize)
      expect(px).toBeGreaterThanOrEqual(16)
    }
  })
})
