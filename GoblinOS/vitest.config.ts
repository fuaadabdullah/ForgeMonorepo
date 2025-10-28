/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
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
  },
})
