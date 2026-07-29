// Vitest-Konfiguration (Issue #42 + #32 E2E-Integration)
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tooling/tests/unit/**/*.test.ts', 'tooling/tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    // 'server-only' ist ein Next.js-Wächter der im Vitest-Node-Context crasht.
    // Wir mocken ihn als no-op damit Tests src/lib/supabase/admin importieren können.
    setupFiles: ['./tooling/tests/integration/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/actions/**', 'src/lib/supabase/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
