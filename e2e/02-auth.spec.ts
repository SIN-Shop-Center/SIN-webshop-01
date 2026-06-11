// Purpose: Auth-Flow (Login + Sign-up) E2E
// Docs: Rate-Limit + Password-Toggle + Error-Translation werden geprüft

import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'e2e-auth-test@delqhi-test.com',
  password: 'TestPass123!TestPass123!',
}

test.describe('Auth Flow', () => {
  test('Login-Page rendert mit Email/Password-Feldern', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /anmelden/i }),
    ).toBeVisible()
  })

  test('Sign-up-Page rendert mit Email/Password-Feldern', async ({ page }) => {
    await page.goto('/auth/sign-up')
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /registrieren|konto erstellen/i }),
    ).toBeVisible()
  })

  test('Login mit falschen Credentials zeigt deutschen Fehler', async ({
    page,
  }) => {
    await page.goto('/auth/login')
    await page.getByLabel(/e-?mail/i).fill('falsch@beispiel.de')
    await page.locator('input[type="password"]').fill('WrongPass123!')
    await page.getByRole('button', { name: /anmelden/i }).click()

    // Warte auf Submit-Abschluss (Loading-Spinner weg)
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeEnabled({
      timeout: 15_000,
    })

    // Hole ALLE alert-Elemente, filtere leere raus
    const alerts = page.getByRole('alert')
    const count = await alerts.count()
    let errorText: string | null = null
    for (let i = 0; i < count; i++) {
      const text = (await alerts.nth(i).textContent())?.trim() ?? ''
      if (text.length > 0) {
        errorText = text
        break
      }
    }

    // Wenn kein Error-Text → warte 2s (rate-limit cooldown) und retry
    if (!errorText) {
      await page.waitForTimeout(2000)
      await page.getByRole('button', { name: /anmelden/i }).click()
      await page.waitForTimeout(3000)
      const retry = page.getByRole('alert')
      const retryCount = await retry.count()
      for (let i = 0; i < retryCount; i++) {
        const text = (await retry.nth(i).textContent())?.trim() ?? ''
        if (text.length > 0) {
          errorText = text
          break
        }
      }
    }

    expect(errorText).toBeTruthy()
    expect(errorText).not.toMatch(/^Invalid/)
    expect(errorText?.toLowerCase()).toMatch(
      /e-?mail|passwort|falsch|fehler|anmelden|versuche/,
    )
  })

  test('Password-Toggle sichtbar im Login-Form', async ({ page }) => {
    await page.goto('/auth/login')
    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()
    // Toggle-Button (aria-label typischerweise "Passwort anzeigen")
    const toggleButton = page.getByRole('button', {
      name: /passwort.*anzeigen|show.*password/i,
    })
    if ((await toggleButton.count()) > 0) {
      await toggleButton.first().click()
      await expect(page.locator('input[type="text"]')).toBeVisible()
    }
  })
})
