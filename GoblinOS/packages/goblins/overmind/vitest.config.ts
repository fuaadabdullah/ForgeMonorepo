/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: [path.resolve(__dirname, '../../../vitest.setup.ts')],
    environment: 'node',
    globals: true,
  },
})
