// Playwright Config — E2E Browser-Tests (Issue #32)
// Docs: https://playwright.dev/docs/test-configuration
//
// Verwendet System-Chrome (statt ms-playwright-Chromium) — spart 200MB
// Download, ist auf macOS Dev-Maschinen eh installiert.

import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT ?? 3000)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequenziell wegen geteilter Test-User
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', // nutze System-Chrome
      },
    },
    {
      name: 'mobile-safari',
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm dev',
        port: PORT,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
        env: { PORT: String(PORT) },
      },
})
