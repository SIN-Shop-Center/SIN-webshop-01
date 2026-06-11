// Vitest-Konfiguration (Issue #42 + #32 E2E-Integration)
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    // 'server-only' ist ein Next.js-Wächter der im Vitest-Node-Context crasht.
    // Wir mocken ihn als no-op damit Tests app/lib/supabase/admin importieren können.
    setupFiles: ['./tests/integration/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/lib/**/*.ts'],
      exclude: ['app/lib/**/actions/**', 'app/lib/supabase/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
