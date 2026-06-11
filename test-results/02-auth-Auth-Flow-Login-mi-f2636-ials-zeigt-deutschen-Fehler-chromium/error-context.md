# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-auth.spec.ts >> Auth Flow >> Login mit falschen Credentials zeigt deutschen Fehler
- Location: e2e/02-auth.spec.ts:30:7

# Error details

```
TimeoutError: locator.fill: Timeout 10000ms exceeded.
Call log:
  - waiting for getByLabel(/e-?mail/i)

```

# Page snapshot

```yaml
- generic [ref=e2]: Cannot GET /auth/login
```

# Test source

```ts
  1  | // Purpose: Auth-Flow (Login + Sign-up) E2E
  2  | // Docs: Rate-Limit + Password-Toggle + Error-Translation werden geprüft
  3  | 
  4  | import { test, expect } from '@playwright/test'
  5  | 
  6  | const TEST_USER = {
  7  |   email: 'e2e-auth-test@delqhi-test.com',
  8  |   password: 'TestPass123!TestPass123!',
  9  | }
  10 | 
  11 | test.describe('Auth Flow', () => {
  12 |   test('Login-Page rendert mit Email/Password-Feldern', async ({ page }) => {
  13 |     await page.goto('/auth/login')
  14 |     await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
  15 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  16 |     await expect(
  17 |       page.getByRole('button', { name: /anmelden/i }),
  18 |     ).toBeVisible()
  19 |   })
  20 | 
  21 |   test('Sign-up-Page rendert mit Email/Password-Feldern', async ({ page }) => {
  22 |     await page.goto('/auth/sign-up')
  23 |     await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
  24 |     await expect(page.locator('input[type="password"]')).toBeVisible()
  25 |     await expect(
  26 |       page.getByRole('button', { name: /registrieren|konto erstellen/i }),
  27 |     ).toBeVisible()
  28 |   })
  29 | 
  30 |   test('Login mit falschen Credentials zeigt deutschen Fehler', async ({
  31 |     page,
  32 |   }) => {
  33 |     await page.goto('/auth/login')
> 34 |     await page.getByLabel(/e-?mail/i).fill('falsch@beispiel.de')
     |                                       ^ TimeoutError: locator.fill: Timeout 10000ms exceeded.
  35 |     await page.locator('input[type="password"]').fill('WrongPass123!')
  36 |     await page.getByRole('button', { name: /anmelden/i }).click()
  37 | 
  38 |     // Warte auf Submit-Abschluss (Loading-Spinner weg)
  39 |     await expect(page.getByRole('button', { name: /anmelden/i })).toBeEnabled({
  40 |       timeout: 15_000,
  41 |     })
  42 | 
  43 |     // Hole ALLE alert-Elemente, filtere leere raus
  44 |     const alerts = page.getByRole('alert')
  45 |     const count = await alerts.count()
  46 |     let errorText: string | null = null
  47 |     for (let i = 0; i < count; i++) {
  48 |       const text = (await alerts.nth(i).textContent())?.trim() ?? ''
  49 |       if (text.length > 0) {
  50 |         errorText = text
  51 |         break
  52 |       }
  53 |     }
  54 | 
  55 |     // Wenn kein Error-Text → warte 2s (rate-limit cooldown) und retry
  56 |     if (!errorText) {
  57 |       await page.waitForTimeout(2000)
  58 |       await page.getByRole('button', { name: /anmelden/i }).click()
  59 |       await page.waitForTimeout(3000)
  60 |       const retry = page.getByRole('alert')
  61 |       const retryCount = await retry.count()
  62 |       for (let i = 0; i < retryCount; i++) {
  63 |         const text = (await retry.nth(i).textContent())?.trim() ?? ''
  64 |         if (text.length > 0) {
  65 |           errorText = text
  66 |           break
  67 |         }
  68 |       }
  69 |     }
  70 | 
  71 |     expect(errorText).toBeTruthy()
  72 |     expect(errorText).not.toMatch(/^Invalid/)
  73 |     expect(errorText?.toLowerCase()).toContain(
  74 |       /e-?mail|passwort|falsch|fehler|anmelden|versuche/i,
  75 |     )
  76 |   })
  77 | 
  78 |   test('Password-Toggle sichtbar im Login-Form', async ({ page }) => {
  79 |     await page.goto('/auth/login')
  80 |     const passwordInput = page.locator('input[type="password"]')
  81 |     await expect(passwordInput).toBeVisible()
  82 |     // Toggle-Button (aria-label typischerweise "Passwort anzeigen")
  83 |     const toggleButton = page.getByRole('button', {
  84 |       name: /passwort.*anzeigen|show.*password/i,
  85 |     })
  86 |     if ((await toggleButton.count()) > 0) {
  87 |       await toggleButton.first().click()
  88 |       await expect(page.locator('input[type="text"]')).toBeVisible()
  89 |     }
  90 |   })
  91 | })
  92 | 
```