import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['../../../vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.{js,ts}'],
    },
    globals: true,
    environment: 'jsdom',
  },
})
