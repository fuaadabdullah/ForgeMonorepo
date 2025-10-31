/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/testing/test/**',
      '**/pact/**',
      '**/forge-master/src/smoke.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}', '**/tests/**'],
    },
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['packages/goblins/overmind/dashboard/**', 'jsdom']],
  },
})
