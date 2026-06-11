// Purpose: A11y-Tests (Issue #32 + #52) — axe-core Integration
// Docs: https://playwright.dev/docs/accessibility-testing

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES_TO_CHECK = [
  { path: '/', name: 'Startseite' },
  { path: '/produkte', name: 'Produktliste' },
  { path: '/auth/login', name: 'Login' },
  { path: '/warenkorb', name: 'Warenkorb' },
]

test.describe('A11y — automatischer Scan', () => {
  for (const { path, name } of PAGES_TO_CHECK) {
    test(`${name} (${path}) hat keine kritischen A11y-Violations`, async ({
      page,
    }) => {
      await page.goto(path)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      // Nur "critical" und "serious" filtern, kleinere Warnungen
      // (color-contrast in dark mode etc.) sind oft false-positive
      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      )
      if (critical.length > 0) {
        console.log(
          `A11y violations on ${path}:`,
          critical.map((v) => `${v.id}: ${v.help}`).join('\n'),
        )
      }
      expect(critical).toHaveLength(0)
    })
  }

  test('Skip-Link vorhanden + funktioniert', async ({ page }) => {
    await page.goto('/')
    // Tab drücken — Skip-Link sollte als erstes fokussiert sein
    await page.keyboard.press('Tab')
    // Skip-Link ist sr-only, daher via Class-Selector
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return {
        tag: el?.tagName ?? '',
        href: el?.getAttribute('href') ?? '',
        text: el?.textContent?.trim() ?? '',
        classes: el?.className ?? '',
      }
    })
    // Skip-Link: <a href="#main-content"> mit "springen" oder "inhalt" im Text
    const isSkipLink =
      focused.href === '#main-content' ||
      focused.text.toLowerCase().includes('inhalt') ||
      focused.text.toLowerCase().includes('skip') ||
      focused.text.toLowerCase().includes('springen')
    expect(isSkipLink, `Expected skip-link, got: ${JSON.stringify(focused)}`).toBeTruthy()
  })
})
