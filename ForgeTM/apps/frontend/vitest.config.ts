import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Only run project tests and explicit contract/tests directories.
    include: [
      'src/**/*.test.{js,mjs,cjs,ts,tsx}',
      'src/**/*.spec.{js,mjs,cjs,ts,tsx}',
      'tests/**/*.test.{js,mjs,cjs,ts,tsx}',
      'tests/**/*.spec.{js,mjs,cjs,ts,tsx}',
    ],
    // Exclude node_modules, build outputs and the e2e folder explicitly.
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
  // Avoid worker/thread issues in some environments (left unset to match local types).
  },
});
