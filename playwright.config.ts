// Playwright Config — E2E Browser-Tests (Issue #32)
// Docs: https://playwright.dev/docs/test-configuration
//
// Lokale Entwicklung kann einen vorhandenen Browser nutzen. In CI installiert
// Playwright den versionierten Chromium-Build, damit die Tests reproduzierbar sind.

import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4173)
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`
const USE_PRODUCTION_SERVER = process.env.E2E_USE_PRODUCTION === 'true'

export default defineConfig({
  testDir: './tooling/tests/e2e',
  globalSetup: './tooling/tests/e2e/global-setup.ts',
  globalTeardown: './tooling/tests/e2e/global-teardown.ts',
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
      testMatch: /^(?!.*mobile).*\.spec\.ts$/, // nicht-mobile Tests
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile',
      testMatch: /.*mobile.*\.spec\.ts/,
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: USE_PRODUCTION_SERVER
          ? `pnpm start --hostname 127.0.0.1 --port ${PORT}`
          : `pnpm dev --hostname 127.0.0.1 --port ${PORT}`,
        url: `${BASE_URL}/api/health`,
        timeout: 120_000,
        reuseExistingServer: process.env.E2E_REUSE_SERVER === 'true',
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, PORT: String(PORT) },
      },
})
